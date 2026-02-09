import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadActivityModel } from '../models/leadActivity.model.js';
import { getLeadModel } from '../models/lead.model.js';
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
        if (!data.stage) {
            throw new AppError('Stage is required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const LeadActivity = getLeadActivityModel(orgConn);
            const Lead = getLeadModel(orgConn);

            // Update the lead's stage and status in the leads table
            const updateFields = { updated_at: new Date() };
            if (data.stage) updateFields.stage = data.stage;
            if (data.status) updateFields.status = data.status;

            await Lead.findOneAndUpdate(
                { profile_id: data.profile_id },
                updateFields,
                { new: true }
            );
            console.log('Lead updated successfully - stage:', data.stage, 'status:', data.status);

            // Create the activity record
            const activity = await LeadActivity.create({
                profile_id: data.profile_id,
                lead_id: data.lead_id,
                user_id: data.user_id,
                stage: data.stage,
                status: data.status || '',
                notes: data.notes || ''
            });
            console.log('Activity created successfully:', activity.id);

            return {
                id: activity.id,
                profile_id: activity.profile_id,
                lead_id: activity.lead_id,
                user_id: activity.user_id,
                stage: activity.stage,
                status: activity.status,
                notes: activity.notes,
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

            return activities.map(activity => ({
                id: activity.id,
                profile_id: activity.profile_id,
                lead_id: activity.lead_id,
                user_id: activity.user_id,
                stage: activity.stage,
                status: activity.status,
                notes: activity.notes,
                createdAt: activity.createdAt ? new Date(activity.createdAt).toISOString() : '',
                updatedAt: activity.updatedAt ? new Date(activity.updatedAt).toISOString() : ''
            }));
        } catch (err) {
            throw new AppError('Failed to fetch lead activities: ' + err.message, 500);
        }
    }
}

export const leadActivityService = new LeadActivityService();
