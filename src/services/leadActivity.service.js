import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadActivityModel } from '../models/leadActivity.model.js';
import { getLeadModel } from '../models/lead.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class LeadActivityService {
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
            const allUserIds = new Set(activities.map(a => Number(a.user_id)));
            activities.forEach(a => { if (a.site_visit_completed_by) allUserIds.add(Number(a.site_visit_completed_by)); });
            const uniqueUserIds = [...allUserIds];
            const users = await ClientUser.find({ profile_id: { $in: uniqueUserIds } }).lean();
            const userMap = new Map(users.map(u => [u.profile_id, `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim()]));

            return activities.map(activity => ({
                id: activity.id,
                profile_id: activity.profile_id,
                updates: activity.updates,
                lead_id: activity.lead_id,
                user_id: activity.user_id,
                user_name: userMap.get(Number(activity.user_id)) || 'Unknown',
                stage: activity.stage,
                status: activity.status,
                notes: activity.notes,
                follow_up_date: activity.follow_up_date ? new Date(activity.follow_up_date).toISOString() : null,
                site_visit_date: activity.site_visit_date ? new Date(activity.site_visit_date).toISOString() : null,
                site_visit_completed: activity.site_visit_completed || false,
                site_visit_completed_at: activity.site_visit_completed_at ? new Date(activity.site_visit_completed_at).toISOString() : null,
                site_visit_completed_by: activity.site_visit_completed_by || null,
                site_visit_completed_by_name: activity.site_visit_completed_by ? (userMap.get(Number(activity.site_visit_completed_by)) || 'Unknown') : null,
                site_visit_project_id: activity.site_visit_project_id || null,
                site_visit_project_name: activity.site_visit_project_name || null,
                createdAt: activity.createdAt ? new Date(activity.createdAt).toISOString() : '',
                updatedAt: activity.updatedAt ? new Date(activity.updatedAt).toISOString() : ''
            }));
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
            const allUserIds = new Set(activities.map(a => Number(a.user_id)));
            activities.forEach(a => { if (a.site_visit_completed_by) allUserIds.add(Number(a.site_visit_completed_by)); });
            const uniqueUserIds = [...allUserIds];
            const users = await ClientUser.find({ profile_id: { $in: uniqueUserIds } }).lean();
            const userMap = new Map(users.map(u => [u.profile_id, `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim()]));

            return activities.map(activity => ({
                id: activity.id,
                updates: activity.updates,
                user_id: activity.user_id,
                user_name: userMap.get(Number(activity.user_id)) || 'Unknown',
                stage: activity.stage,
                reason: activity.reason,
                status: activity.status,
                notes: activity.notes,
                follow_up_date: activity.follow_up_date ? new Date(activity.follow_up_date).toISOString() : null,
                site_visit_date: activity.site_visit_date ? new Date(activity.site_visit_date).toISOString() : null,
                site_visit_completed: activity.site_visit_completed || false,
                site_visit_completed_at: activity.site_visit_completed_at ? new Date(activity.site_visit_completed_at).toISOString() : null,
                site_visit_completed_by: activity.site_visit_completed_by || null,
                site_visit_completed_by_name: activity.site_visit_completed_by ? (userMap.get(Number(activity.site_visit_completed_by)) || 'Unknown') : null,
                site_visit_project_id: activity.site_visit_project_id || null,
                site_visit_project_name: activity.site_visit_project_name || null,
                createdAt: activity.createdAt ? new Date(activity.createdAt).toISOString() : '',
                updatedAt: activity.updatedAt ? new Date(activity.updatedAt).toISOString() : ''
            }));
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
    async getSiteVisitsForCalendar(organization, { startDate, endDate, userId, teamId, projectId } = {}) {
        if (!organization) throw new AppError('Organization is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const LeadActivity = getLeadActivityModel(orgConn);
            const Lead = getLeadModel(orgConn);
            const ClientUser = getClientUserModel(orgConn);

            // Base filter: only site_visit activities that have a date
            const filter = { updates: 'site_visit', site_visit_date: { $ne: null } };

            // Date range filter
            if (startDate || endDate) {
                filter.site_visit_date = filter.site_visit_date || {};
                if (startDate) filter.site_visit_date.$gte = new Date(startDate);
                if (endDate) filter.site_visit_date.$lte = new Date(endDate);
            }

            // Team filter: resolve team members, then filter by user_id
            if (teamId) {
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
            if (userId) {
                filter.user_id = userId;
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
            const allUserIds = new Set(activities.map(a => Number(a.user_id)));
            activities.forEach(a => { if (a.site_visit_completed_by) allUserIds.add(Number(a.site_visit_completed_by)); });
            const users = await ClientUser.find({ profile_id: { $in: [...allUserIds] } }).lean();
            const userMap = new Map(users.map(u => [u.profile_id, `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim()]));

            // Batch-resolve lead names
            const leadIds = [...new Set(activities.map(a => a.lead_id))];
            const leads = await Lead.find({ _id: { $in: leadIds } }).select('_id profile.name').lean();
            const leadMap = new Map(leads.map(l => [l._id.toString(), l.profile?.name || 'Unknown']));

            return activities.map(a => ({
                id: a.id,
                lead_id: a.lead_id,
                lead_name: leadMap.get(a.lead_id) || 'Unknown',
                profile_id: a.profile_id,
                user_id: a.user_id,
                user_name: userMap.get(Number(a.user_id)) || 'Unknown',
                site_visit_date: a.site_visit_date ? new Date(a.site_visit_date).toISOString() : null,
                site_visit_completed: a.site_visit_completed || false,
                site_visit_completed_at: a.site_visit_completed_at ? new Date(a.site_visit_completed_at).toISOString() : null,
                site_visit_completed_by: a.site_visit_completed_by || null,
                site_visit_completed_by_name: a.site_visit_completed_by ? (userMap.get(Number(a.site_visit_completed_by)) || 'Unknown') : null,
                site_visit_project_id: a.site_visit_project_id || null,
                site_visit_project_name: a.site_visit_project_name || null,
                createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : '',
            }));
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch site visit calendar data: ' + err.message, 500);
        }
    }
}

export const leadActivityService = new LeadActivityService();
