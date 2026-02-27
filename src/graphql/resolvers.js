// GraphQL Resolvers
import { leadService } from '../services/lead.service.js';
import { leadActivityService } from '../services/leadActivity.service.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getClientUserModel } from '../models/clientUser.model.js';

export const resolvers = {
    Query: {
        getAllLeads: async (_, { organization }) => {
            const leads = await leadService.getAllLeads(organization);
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
        getLeadById: async (_, { organization, id }) => {
            return await leadService.getLeadById(organization, id);
        },
        getLeadActivities: async (_, { organization, leadId }) => {
            return await leadActivityService.getActivitiesByLeadId(organization, leadId);
        },
        getLeadActivitiesByProfileId: async (_, { organization, profileId }) => {
            return await leadActivityService.getActivitiesByProfileId(organization, profileId);
        },
    },
    Mutation: {
        createLeadActivity: async (_, { organization, input }) => {
            return await leadActivityService.createActivity(organization, input);
        },
        updateLead: async (_, { organization, id, input }) => {
            return await leadService.updateLead(organization, id, input);
        },
        markSiteVisitCompleted: async (_, { organization, activityId, userId }) => {
            return await leadActivityService.markSiteVisitCompleted(organization, activityId, userId);
        },
    },
    LeadDetail: {
        activities: async (parent, _, context) => {
            // parent contains the LeadDetail object with organization and profile_id
            return await leadActivityService.getActivitiesByProfileId(parent.organization, parent.profile_id);
        },
        site_visits_completed: async (parent) => {
            const activities = await leadActivityService.getActivitiesByProfileId(parent.organization, parent.profile_id);
            return activities.filter(a => a.updates === 'site_visit' && a.site_visit_completed).length;
        },
        exe_user_name: async (parent) => {
            if (!parent.exe_user || !parent.organization) return '';
            try {
                const orgConn = await getOrganizationConnection(parent.organization);
                const ClientUser = getClientUserModel(orgConn);
                const user = await ClientUser.findById(parent.exe_user).select('profile').lean();
                if (user) {
                    return `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
                }
            } catch (err) {
                console.error('Failed to resolve exe_user_name:', err.message);
            }
            return '';
        },
    },
};
