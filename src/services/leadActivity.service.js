import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadActivityModel } from '../models/leadActivity.model.js';
import { getLeadModel } from '../models/lead.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class LeadActivityService {
    /**
     * Helper to resolve the local organization user IDs (UUID and profile_id)
     * based on the global user's email or ID.
     */
    async _getEffectiveUserIds(orgConn, user) {
        if (!user) return null;
        const ClientUser = getClientUserModel(orgConn);
        
        // Find the user in the organization's database
        const email = user.email || user.profile?.email;
        const orgUser = await ClientUser.findOne({ 
            $or: [
                { globalUserId: user._id },
                { profile_id: user.profile_id },
                { "profile.email": email }
            ] 
        }).select('_id profile_id').lean();

        if (!orgUser) return { ids: [user._id] };

        const ids = [orgUser._id.toString(), String(orgUser.profile_id)];
        // Add global ID as well just in case
        if (user._id && !ids.includes(user._id.toString())) {
            ids.push(user._id.toString());
        }
        return { ids };
    }

    /**
     * Create a new lead activity record and update lead's stage
     * @param {string} organization - Organization name for multi-tenant DB
     * @param {object} data - Activity data containing profile_id, lead_id, user_id, stage, status, notes
     * @returns {object} Created activity record
     */
    async createActivity(organization, data) {
        console.log('=== createActivity called ===');
        console.log('Organization:', organization);
        console.log('Data:', JSON.stringify(data, null, 2));

        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!data.profile_id) {
            throw new AppError('Profile ID is required', 400);
        }
        if (!data.lead_id) {
            throw new AppError('Lead ID is required', 400);
        }
        if (!data.user_id) {
            throw new AppError('User ID is required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const LeadActivity = getLeadActivityModel(orgConn);
            const Lead = getLeadModel(orgConn);

            // Only update the lead's stage and status if provided
            if (data.stage || data.status) {
                const updateFields = { updated_at: new Date() };
                if (data.stage) updateFields.stage = data.stage;
                if (data.status) updateFields.status = data.status;

                await Lead.findOneAndUpdate(
                    { profile_id: data.profile_id },
                    updateFields,
                    { new: true }
                );
                console.log('Lead updated successfully - stage:', data.stage, 'status:', data.status);
            }

            // Create the activity record
            const activity = await LeadActivity.create({
                profile_id: data.profile_id,
                updates: data.updates,
                lead_id: data.lead_id,
                reason: data.reason || '',
                user_id: data.user_id,
                stage: data.stage || '',
                status: data.status || '',
                notes: data.notes || '',
                follow_up_date: data.follow_up_date || null,
                site_visit_date: data.site_visit_date || null,
                site_visit_completed: data.site_visit_completed || false,
                site_visit_project_id: data.site_visit_project_id || null,
                site_visit_project_name: data.site_visit_project_name || null
            });
            console.log('Activity created successfully:', activity.id);
            console.log('Activity:', activity);

            // Resolve user name
            const ClientUser = getClientUserModel(orgConn);
            const user = await ClientUser.findOne({ profile_id: Number(activity.user_id) }).lean();
            const user_name = user ? `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() : 'Unknown';

            return {
                id: activity.id,
                profile_id: activity.profile_id,
                updates: activity.updates,
                lead_id: activity.lead_id,
                reason: activity.reason,
                user_id: activity.user_id,
                user_name,
                stage: activity.stage,
                status: activity.status,
                notes: activity.notes,
                follow_up_date: activity.follow_up_date ? new Date(activity.follow_up_date).toISOString() : null,
                site_visit_date: activity.site_visit_date ? new Date(activity.site_visit_date).toISOString() : null,
                site_visit_completed: activity.site_visit_completed || false,
                site_visit_project_id: activity.site_visit_project_id || null,
                site_visit_project_name: activity.site_visit_project_name || null,
                createdAt: activity.createdAt ? new Date(activity.createdAt).toISOString() : '',
                updatedAt: activity.updatedAt ? new Date(activity.updatedAt).toISOString() : ''
            };
        } catch (err) {
            console.error('Error in createActivity:', err);
            throw new AppError('Failed to create lead activity: ' + err.message, 500);
        }
    }

    /**
     * Get all activities for a specific lead
     * @param {string} organization - Organization name for multi-tenant DB
     * @param {string} leadId - Lead ID to fetch activities for
     * @returns {array} List of activities
     */
    async getActivitiesByLeadId(organization, leadId) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!leadId) {
            throw new AppError('Lead ID is required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const LeadActivity = getLeadActivityModel(orgConn);

            const activities = await LeadActivity.find({ lead_id: leadId })
                .sort({ createdAt: -1 })
                .lean();

            // Batch-resolve user names (including completed_by users)
            const ClientUser = getClientUserModel(orgConn);
            const allProfileIds = new Set();
            const allUuids = new Set();
            activities.forEach(a => {
                const uid = Number(a.user_id);
                if (!isNaN(uid)) allProfileIds.add(uid);
                else if (a.user_id) allUuids.add(a.user_id);
                
                if (a.site_visit_completed_by) {
                    const cid = Number(a.site_visit_completed_by);
                    if (!isNaN(cid)) allProfileIds.add(cid);
                    else allUuids.add(a.site_visit_completed_by);
                }
            });
            const uniqueProfileIds = [...allProfileIds];
            const uniqueUuids = [...allUuids];
            
            const userQuery = [];
            if (uniqueProfileIds.length > 0) userQuery.push({ profile_id: { $in: uniqueProfileIds } });
            if (uniqueUuids.length > 0) {
                userQuery.push({ _id: { $in: uniqueUuids } });
                userQuery.push({ globalUserId: { $in: uniqueUuids } });
            }
            
            let users = [];
            if (userQuery.length > 0) {
                users = await ClientUser.find({ $or: userQuery }).lean();
            }

            const userMap = new Map();
            users.forEach(u => {
                const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim();
                const image = u.profile?.profileImagePath || '';
                const userData = { name, image };
                if (u.profile_id) userMap.set(String(u.profile_id), userData);
                if (u._id) userMap.set(String(u._id), userData);
                if (u.globalUserId) userMap.set(String(u.globalUserId), userData);
            });

            return activities.map(activity => {
                const userData = userMap.get(String(activity.user_id)) || { name: 'Unknown', image: '' };
                return {
                    id: activity.id,
                    profile_id: activity.profile_id,
                    updates: activity.updates,
                    lead_id: activity.lead_id,
                    user_id: activity.user_id,
                    user_name: userData.name,
                    user_image: userData.image,
                    stage: activity.stage,
                    status: activity.status,
                    notes: activity.notes,
                    follow_up_date: activity.follow_up_date ? new Date(activity.follow_up_date).toISOString() : null,
                    site_visit_date: activity.site_visit_date ? new Date(activity.site_visit_date).toISOString() : null,
                    site_visit_completed: activity.site_visit_completed || false,
                    site_visit_completed_at: activity.site_visit_completed_at ? new Date(activity.site_visit_completed_at).toISOString() : null,
                    site_visit_completed_by: activity.site_visit_completed_by || null,
                    site_visit_completed_by_name: activity.site_visit_completed_by ? (userMap.get(String(activity.site_visit_completed_by))?.name || 'Unknown') : null,
                    site_visit_project_id: activity.site_visit_project_id || null,
                    site_visit_project_name: activity.site_visit_project_name || null,
                    createdAt: activity.createdAt ? new Date(activity.createdAt).toISOString() : '',
                    updatedAt: activity.updatedAt ? new Date(activity.updatedAt).toISOString() : ''
                };
            });
        } catch (err) {
            throw new AppError('Failed to fetch lead activities: ' + err.message, 500);
        }
    }

    /**
     * Get all activities for a lead by profile_id
     */
    async getActivitiesByProfileId(organization, profileId) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!profileId) {
            throw new AppError('Profile ID is required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const LeadActivity = getLeadActivityModel(orgConn);

            const activities = await LeadActivity.find({ profile_id: profileId })
                .sort({ createdAt: -1 })
                .lean();

            // Batch-resolve user names (including completed_by users)
            const ClientUser = getClientUserModel(orgConn);
            const allProfileIds = new Set();
            const allUuids = new Set();
            activities.forEach(a => {
                const uid = Number(a.user_id);
                if (!isNaN(uid)) allProfileIds.add(uid);
                else if (a.user_id) allUuids.add(a.user_id);
                
                if (a.site_visit_completed_by) {
                    const cid = Number(a.site_visit_completed_by);
                    if (!isNaN(cid)) allProfileIds.add(cid);
                    else allUuids.add(a.site_visit_completed_by);
                }
            });
            const uniqueProfileIds = [...allProfileIds];
            const uniqueUuids = [...allUuids];
            
            const userQuery = [];
            if (uniqueProfileIds.length > 0) userQuery.push({ profile_id: { $in: uniqueProfileIds } });
            if (uniqueUuids.length > 0) {
                userQuery.push({ _id: { $in: uniqueUuids } });
                userQuery.push({ globalUserId: { $in: uniqueUuids } });
            }
            
            let users = [];
            if (userQuery.length > 0) {
                users = await ClientUser.find({ $or: userQuery }).lean();
            }

            const userMap = new Map();
            users.forEach(u => {
                const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim();
                const image = u.profile?.profileImagePath || '';
                const userData = { name, image };
                if (u.profile_id) userMap.set(String(u.profile_id), userData);
                if (u._id) userMap.set(String(u._id), userData);
                if (u.globalUserId) userMap.set(String(u.globalUserId), userData);
            });

            return activities.map(activity => {
                const userData = userMap.get(String(activity.user_id)) || { name: 'Unknown', image: '' };
                return {
                    id: activity.id,
                    profile_id: activity.profile_id,
                    lead_id: activity.lead_id,
                    updates: activity.updates,
                    user_id: activity.user_id,
                    user_name: userData.name,
                    user_image: userData.image,
                    stage: activity.stage,
                    reason: activity.reason,
                    status: activity.status,
                    notes: activity.notes,
                    follow_up_date: activity.follow_up_date ? new Date(activity.follow_up_date).toISOString() : null,
                    site_visit_date: activity.site_visit_date ? new Date(activity.site_visit_date).toISOString() : null,
                    site_visit_completed: activity.site_visit_completed || false,
                    site_visit_completed_at: activity.site_visit_completed_at ? new Date(activity.site_visit_completed_at).toISOString() : null,
                    site_visit_completed_by: activity.site_visit_completed_by || null,
                    site_visit_completed_by_name: activity.site_visit_completed_by ? (userMap.get(String(activity.site_visit_completed_by))?.name || 'Unknown') : null,
                    site_visit_project_id: activity.site_visit_project_id || null,
                    site_visit_project_name: activity.site_visit_project_name || null,
                    createdAt: activity.createdAt ? new Date(activity.createdAt).toISOString() : '',
                    updatedAt: activity.updatedAt ? new Date(activity.updatedAt).toISOString() : ''
                };
            });
        } catch (err) {
            throw new AppError('Failed to fetch lead activities: ' + err.message, 500);
        }
    }
    /**
     * Mark a site visit activity as completed
     */
    async markSiteVisitCompleted(organization, activityId, userId) {
        if (!organization) throw new AppError('Organization is required', 400);
        if (!activityId) throw new AppError('Activity ID is required', 400);
        if (!userId) throw new AppError('User ID is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const LeadActivity = getLeadActivityModel(orgConn);

            const activity = await LeadActivity.findOneAndUpdate(
                { id: activityId, updates: 'site_visit' },
                {
                    site_visit_completed: true,
                    site_visit_completed_at: new Date(),
                    site_visit_completed_by: userId
                },
                { new: true }
            ).lean();

            if (!activity) throw new AppError('Site visit activity not found', 404);

            // Resolve user names
            const ClientUser = getClientUserModel(orgConn);
            const user = await ClientUser.findOne({ profile_id: Number(activity.user_id) }).lean();
            const user_name = user ? `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() : 'Unknown';

            // Resolve the name of the user who marked it completed
            let completed_by_name = 'Unknown';
            if (activity.site_visit_completed_by) {
                const completedByUser = await ClientUser.findOne({ profile_id: Number(activity.site_visit_completed_by) }).lean();
                completed_by_name = completedByUser ? `${completedByUser.profile?.firstName || ''} ${completedByUser.profile?.lastName || ''}`.trim() : 'Unknown';
            }

            return {
                id: activity.id,
                profile_id: activity.profile_id,
                updates: activity.updates,
                lead_id: activity.lead_id,
                user_id: activity.user_id,
                user_name,
                stage: activity.stage,
                status: activity.status,
                notes: activity.notes,
                follow_up_date: activity.follow_up_date ? new Date(activity.follow_up_date).toISOString() : null,
                site_visit_date: activity.site_visit_date ? new Date(activity.site_visit_date).toISOString() : null,
                site_visit_completed: activity.site_visit_completed || false,
                site_visit_completed_at: activity.site_visit_completed_at ? new Date(activity.site_visit_completed_at).toISOString() : null,
                site_visit_completed_by: activity.site_visit_completed_by || null,
                site_visit_completed_by_name: completed_by_name,
                site_visit_project_id: activity.site_visit_project_id || null,
                site_visit_project_name: activity.site_visit_project_name || null,
                createdAt: activity.createdAt ? new Date(activity.createdAt).toISOString() : '',
                updatedAt: activity.updatedAt ? new Date(activity.updatedAt).toISOString() : ''
            };
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to mark site visit as completed: ' + err.message, 500);
        }
    }

    /**
     * Get all site visit activities for calendar view with optional filters
     * @param {string} organization
     * @param {object} filters - { startDate, endDate, userId, teamId }
     * @returns {array} List of site visit calendar entries
     */
    async getSiteVisitsForCalendar(organization, { startDate, endDate, userId, teamId, projectId } = {}, user = null) {
        if (!organization) throw new AppError('Organization is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const LeadActivity = getLeadActivityModel(orgConn);
            const Lead = getLeadModel(orgConn);
            const ClientUser = getClientUserModel(orgConn);

            // Role-based filtering
            const role = user?.role?.toLowerCase();
            const isAdmin = role === 'admin' || role === 'manager';
            let effectiveUserFilter = null;
            if (!isAdmin && user) {
                effectiveUserFilter = await this._getEffectiveUserIds(orgConn, user);
            } else if (userId) {
                effectiveUserFilter = { ids: [userId] };
            }

            // Base filter: only site_visit activities that have a date
            const filter = { updates: 'site_visit', site_visit_date: { $ne: null } };

            if (startDate || endDate) {
                filter.site_visit_date = { $ne: null };
                if (startDate) {
                    filter.site_visit_date.$gte = new Date(startDate);
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    filter.site_visit_date.$lte = end;
                }
            } else {
                // Task 1: default view - we'll show everything for the calendar 
                // but usually the frontend passes a date range if it wants something specific.
                // Removing the mandatory today cap to allow future Scheduled visits.
                filter.site_visit_date = { $ne: null };
            }

            // Team filter: resolve team members, then filter by user_id
            if (teamId && isAdmin) { // Only admins can filter by team
                const { getClientTeamModel } = await import('../models/team.model.js');
                const Team = getClientTeamModel(orgConn);
                const team = await Team.findById(teamId).lean();
                if (team && team.members && team.members.length > 0) {
                    // Get profile_ids for team members
                    const memberUsers = await ClientUser.find({ _id: { $in: team.members } }).select('profile_id').lean();
                    const memberProfileIds = memberUsers.map(u => String(u.profile_id));
                    filter.user_id = { $in: memberProfileIds };
                } else {
                    return []; // team not found or empty
                }
            }

            // Individual user filter (overrides team filter for user_id)
            if (effectiveUserFilter) {
                filter.user_id = { $in: effectiveUserFilter.ids };
            }

            // Project filter
            if (projectId) {
                filter.site_visit_project_id = projectId;
            }

            const activities = await LeadActivity.find(filter)
                .sort({ site_visit_date: 1 })
                .lean();

            if (activities.length === 0) return [];

            // Batch-resolve user names
            const allProfileIds = new Set();
            const allUuids = new Set();
            activities.forEach(a => {
                const uid = Number(a.user_id);
                if (!isNaN(uid)) allProfileIds.add(uid);
                else if (a.user_id) allUuids.add(a.user_id);
                if (a.site_visit_completed_by) {
                    const cid = Number(a.site_visit_completed_by);
                    if (!isNaN(cid)) allProfileIds.add(cid);
                    else allUuids.add(a.site_visit_completed_by);
                }
            });
            const uniqueProfileIds = [...allProfileIds];
            const uniqueUuids = [...allUuids];
            
            const userQuery = [];
            if (uniqueProfileIds.length > 0) userQuery.push({ profile_id: { $in: uniqueProfileIds } });
            if (uniqueUuids.length > 0) {
                userQuery.push({ _id: { $in: uniqueUuids } });
                userQuery.push({ globalUserId: { $in: uniqueUuids } });
            }
            
            let users = [];
            if (userQuery.length > 0) {
                users = await ClientUser.find({ $or: userQuery }).lean();
            }

            const userMap = new Map();
            users.forEach(u => {
                const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim();
                if (u.profile_id) userMap.set(String(u.profile_id), name);
                if (u._id) userMap.set(String(u._id), name);
                if (u.globalUserId) userMap.set(String(u.globalUserId), name);
            });

            // Need lead details to get lead name
            const leadIds = [...new Set(activities.map(a => String(a.lead_id)))];
            const leads = await Lead.find({ _id: { $in: leadIds } }).select('profile_id profile').lean();
            const leadMap = new Map(leads.map(l => [String(l._id), l]));

            return activities.map(activity => {
                const lead = leadMap.get(String(activity.lead_id));
                return {
                    id: activity.id,
                    profile_id: activity.profile_id,
                    lead_id: activity.lead_id,
                    lead_name: lead?.profile?.name || 'Unknown',
                    user_id: activity.user_id,
                    user_name: userMap.get(String(activity.user_id)) || 'Unknown',
                    site_visit_date: activity.site_visit_date ? new Date(activity.site_visit_date).toISOString() : null,
                    site_visit_completed: activity.site_visit_completed || false,
                    site_visit_completed_at: activity.site_visit_completed_at ? new Date(activity.site_visit_completed_at).toISOString() : null,
                    site_visit_completed_by: activity.site_visit_completed_by || null,
                    site_visit_completed_by_name: activity.site_visit_completed_by ? (userMap.get(String(activity.site_visit_completed_by)) || 'Unknown') : null,
                    site_visit_project_id: activity.site_visit_project_id || null,
                    site_visit_project_name: activity.site_visit_project_name || null,
                    createdAt: activity.createdAt ? new Date(activity.createdAt).toISOString() : ''
                };
            });
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch site visit calendar data: ' + err.message, 500);
        }
    }
}

export const leadActivityService = new LeadActivityService();
