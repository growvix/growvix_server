import { leadService } from '../services/lead.service.js';
import { leadActivityService } from '../services/leadActivity.service.js';
import { projectService } from '../services/project.service.js';
import { userService } from '../services/user.service.js';
import { leadStageService } from '../services/leadStage.service.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { User } from '../models/user.model.js';

export const resolvers = {
    Query: {
        getAllLeads: async (_, { organization }, context) => {
            const result = await leadService.getAllLeads(organization, {}, { user: context.user });
            const leads = result.leads || [];
            // Resolve exe_user_name for each lead
            if (leads.length > 0) {
                try {
                    const orgConn = await getOrganizationConnection(organization);
                    const ClientUser = getClientUserModel(orgConn);
                    const userIds = [...new Set(leads.filter(l => l.exe_user).map(l => l.exe_user))];
                    if (userIds.length > 0) {
                        const users = await ClientUser.find({ _id: { $in: userIds } }).select('_id profile').lean();
                        const userMap = {};
                        users.forEach(u => {
                            userMap[u._id.toString()] = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim();
                        });
                        leads.forEach(lead => {
                            lead.exe_user_name = lead.exe_user ? (userMap[lead.exe_user] || '') : '';
                        });
                    }
                } catch (err) {
                    console.error('Failed to resolve exe_user_name for leads:', err.message);
                }
            }
            return leads;
        },
        getLeadById: async (_, { organization, id }, context) => {
            return await leadService.getLeadById(organization, id, context.user);
        },
        getLeadActivities: async (_, { organization, leadId }) => {
            const activities = await leadActivityService.getActivitiesByLeadId(organization, leadId);
            return activities.map(a => ({ ...a, organization }));
        },
        getLeadActivitiesByProfileId: async (_, { organization, profileId }) => {
            const activities = await leadActivityService.getActivitiesByProfileId(organization, profileId);
            return activities.map(a => ({ ...a, organization }));
        },
        getSiteVisitActivities: async (_, { organization, startDate, endDate, userId, teamId, projectId }, context) => {
            return await leadActivityService.getSiteVisitsForCalendar(organization, { startDate, endDate, userId, teamId, projectId }, context.user);
        },
        getAllProjects: async (_, { organization }) => {
            const projects = await projectService.getAllProjects(organization);
            return projects.map(p => ({
                ...p,
                organization, // Inject organization for field resolvers
                img_location: p.img_location || null,
            }));
        },
        getProjectById: async (_, { organization, id }) => {
            const project = await projectService.getProjectById(organization, id);
            if (!project) return null;
            return {
                ...project.toObject(),
                organization // Inject organization for field resolvers
            };
        },
        getLeadStages: async (_, { organization }) => {
            const result = await leadStageService.getStages(organization);
            return {
                stages: (result?.stages || []).map(s => ({
                    id: s.id,
                    name: s.name,
                    color: s.color,
                    nextStages: s.nextStages || [],
                })),
            };
        },
        getOrganizationUsers: async (_, { organization }, context) => {
            const result = await userService.getOrganizationUsers(organization, 100, 1, context.user?.permissions || []);
            return (result.users || []).map(u => ({
                _id: u._id?.toString() || '',
                globalUserId: u.globalUserId?.toString() || '',
                profile: u.profile || null,
                role: u.role || 'user',
                isActive: u.isActive ?? true,
            }));
        },
        searchLeadsByName: async (_, { organization, name }, context) => {
            const result = await leadService.getAllLeads(organization, { name }, { user: context.user });
            // Filter out leads that are already part of any merge relationship
            // Rule: Don't show secondary leads or leads that are already primary for others
            const filteredLeads = (result.leads || []).filter(l => {
                const isSecondary = !!l.is_secondary;
                const isPrimary = l.merge_id && l.merge_id.length > 0;
                return !isSecondary && !isPrimary;
            });

            return filteredLeads.map(l => ({
                _id: l.lead_id,
                profile_id: l.profile_id,
                organization,
                profile: {
                    name: l.name,
                    phone: l.phone,
                    email: l.email
                },
                stage: l.stage,
                status: l.status
            }));
        },

    },
    ProjectSummary: {
        bookedUnits: async (parent, _, context) => {
            if (!parent.organization || !parent.product_id) return null;
            try {
                return await projectService.getProjectBookedUnits(parent.organization, parent.product_id, context.user?.permissions || []);
            } catch (err) {
                console.error(`Failed to fetch booked units for project ${parent.product_id}:`, err.message);
                return [];
            }
        }
    },
    Mutation: {
        createLeadActivity: async (_, { organization, input }) => {
            return await leadActivityService.createActivity(organization, input);
        },
        updateLead: async (_, { organization, id, input }, context) => {
            return await leadService.updateLead(organization, id, input, context.user);
        },
        deleteLead: async (_, { organization, profileId }) => {
            return await leadService.deleteLeadByProfileId(organization, profileId);
        },
        markSiteVisitCompleted: async (_, { organization, activityId, userId }) => {
            return await leadActivityService.markSiteVisitCompleted(organization, activityId, userId);
        },
        addRequirement: async (_, { organization, leadId, key, value }) => {
            return await leadService.addRequirement(organization, leadId, key, value);
        },
        removeRequirement: async (_, { organization, leadId, requirementId }) => {
            return await leadService.removeRequirement(organization, leadId, requirementId);
        },
        updatePropertyRequirement: async (_, { organization, leadId, input }) => {
            return await leadService.updatePropertyRequirement(organization, leadId, input);
        },
        addInterestedProject: async (_, { organization, leadId, projectId }) => {
            return await leadService.addInterestedProject(organization, leadId, projectId);
        },
        removeInterestedProject: async (_, { organization, leadId, projectId }) => {
            return await leadService.removeInterestedProject(organization, leadId, projectId);
        },
        toggleImportantActivity: async (_, { organization, leadId, activityId, userId }) => {
            return await leadService.toggleImportantActivity(organization, leadId, activityId, userId);
        },

    },
    LeadDetail: {
        activities: async (parent, _, context) => {
            // parent contains the LeadDetail object with organization and profile_id
            const activities = await leadActivityService.getActivitiesByProfileId(parent.organization, parent.profile_id);
            return activities.map(a => ({ ...a, organization: parent.organization }));
        },
        site_visits_completed: async (parent) => {
            const activities = await leadActivityService.getActivitiesByProfileId(parent.organization, parent.profile_id);
            return activities.filter(a => a.updates === 'site_visit' && a.site_visit_completed).length;
        },
        exe_user_name: async (parent) => {
            if (parent.exe_user_name) return parent.exe_user_name;
            if (!parent.exe_user || !parent.organization) return '';
            try {
                const orgConn = await getOrganizationConnection(parent.organization);
                const ClientUser = getClientUserModel(orgConn);
                
                let user;
                if (typeof parent.exe_user === 'string' && parent.exe_user.length > 20) {
                    user = await ClientUser.findById(parent.exe_user).select('profile').lean();
                } else {
                    const profId = parseInt(parent.exe_user, 10);
                    if (!isNaN(profId)) {
                        user = await ClientUser.findOne({ profile_id: profId }).select('profile').lean();
                    }
                }

                if (user) {
                    return `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
                }

                // Fallback to global
                let globalUser;
                if (typeof parent.exe_user === 'string' && parent.exe_user.length > 20) {
                    globalUser = await User.findById(parent.exe_user).select('profile').lean();
                } else {
                    const profId = parseInt(parent.exe_user, 10);
                    if (!isNaN(profId)) {
                        globalUser = await User.findOne({ profile_id: profId }).select('profile').lean();
                    }
                }

                if (globalUser) {
                    return `${globalUser.profile?.firstName || ''} ${globalUser.profile?.lastName || ''}`.trim();
                }
            } catch (err) {
                console.error('Failed to resolve exe_user_name:', err.message);
            }
            return '';
        },
        exe_user_image: async (parent) => {
            // Priority 1: Field already populated by service (should be a non-empty string)
            if (parent.exe_user_image && typeof parent.exe_user_image === 'string' && parent.exe_user_image.length > 0) {
                return parent.exe_user_image;
            }
            if (!parent.exe_user || !parent.organization) return '';
            
            try {
                // Priority 2: Look in Organization Database
                const orgConn = await getOrganizationConnection(parent.organization);
                const ClientUser = getClientUserModel(orgConn);
                
                let user;
                // Support both UUID and profile_id
                if (typeof parent.exe_user === 'string' && parent.exe_user.length > 20) {
                    user = await ClientUser.findById(parent.exe_user).select('profile').lean();
                } else {
                    const profId = parseInt(parent.exe_user, 10);
                    if (!isNaN(profId)) {
                        user = await ClientUser.findOne({ profile_id: profId }).select('profile').lean();
                    }
                }

                if (user?.profile?.profileImagePath) {
                    return user.profile.profileImagePath;
                }

                // Priority 3: Fallback to Global Database
                let globalUser;
                if (typeof parent.exe_user === 'string' && parent.exe_user.length > 20) {
                    globalUser = await User.findById(parent.exe_user).select('profile').lean();
                } else {
                    const profId = parseInt(parent.exe_user, 10);
                    if (!isNaN(profId)) {
                        globalUser = await User.findOne({ profile_id: profId }).select('profile').lean();
                    }
                }

                if (globalUser?.profile?.profileImagePath) {
                    return globalUser.profile.profileImagePath;
                }
            } catch (err) {
                console.error('Failed to resolve exe_user_image:', err.message);
            }
            return '';
        },
    },
    LeadActivity: {
        user_image: async (parent) => {
            if (parent.user_image && typeof parent.user_image === 'string' && parent.user_image.length > 0) {
                return parent.user_image;
            }
            if (!parent.user_id || !parent.organization) return '';
            
            try {
                const orgConn = await getOrganizationConnection(parent.organization);
                const ClientUser = getClientUserModel(orgConn);
                
                let user;
                if (typeof parent.user_id === 'string' && parent.user_id.length > 20) {
                    user = await ClientUser.findById(parent.user_id).select('profile').lean();
                } else {
                    const pId = parseInt(parent.user_id, 10);
                    if (!isNaN(pId)) {
                        user = await ClientUser.findOne({ profile_id: pId }).select('profile').lean();
                    }
                }

                if (user?.profile?.profileImagePath) {
                    return user.profile.profileImagePath;
                }

                // Fallback to global
                let globalUser;
                if (typeof parent.user_id === 'string' && parent.user_id.length > 20) {
                    globalUser = await User.findById(parent.user_id).select('profile').lean();
                } else {
                    const pId = parseInt(parent.user_id, 10);
                    if (!isNaN(pId)) {
                        globalUser = await User.findOne({ profile_id: pId }).select('profile').lean();
                    }
                }

                if (globalUser?.profile?.profileImagePath) {
                    return globalUser.profile.profileImagePath;
                }
            } catch (err) {
                console.error('Failed to resolve activity user_image:', err.message);
            }
            return '';
        },
    },
};
