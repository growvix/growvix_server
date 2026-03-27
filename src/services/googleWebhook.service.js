import { GoogleConfig } from '../models/googleConfig.model.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadModel } from '../models/lead.model.js';
import { getGoogleWebhookEventModel } from '../models/googleWebhookEvent.model.js';
import { roundRobinService } from './roundRobin.service.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper: Find a value in Google's user_column_data array by column_id.
 */
const getField = (columnData = [], columnId) =>
    columnData.find(f => f.column_id === columnId)?.string_value || '';

/**
 * Get the next available profile_id for a lead in the org DB.
 */
const getNextProfileId = async (Lead) => {
    const lastLead = await Lead.findOne().sort({ profile_id: -1 }).select('profile_id').lean();
    return (lastLead?.profile_id || 0) + 1;
};

class GoogleWebhookService {
    /**
     * STEP 1: Validate the incoming webhook key against the global_admin DB.
     * Returns the google_config document (which contains the organization) if valid.
     * Returns null if key is invalid.
     */
    async validateAndGetConfig(googleKey) {
        if (!googleKey) return null;
        const config = await GoogleConfig.findOne({ secret_key: googleKey }).lean();
        return config || null;
    }

    /**
     * STEP 2: Process the lead and save it to the org's multi-tenant DB.
     * Assigns the lead to a pre-sales user via round-robin.
     */
    async processLeadFormSubmission(organization, data) {
        const orgConn = await getOrganizationConnection(organization);
        const Lead = getLeadModel(orgConn);

        const cols = data.user_column_data || [];

        // ── Map Google fields using column_id ──
        const name = getField(cols, 'FULL_NAME') || `Google Lead`;
        const email = getField(cols, 'EMAIL');
        const phone = getField(cols, 'PHONE_NUMBER');
        const company = getField(cols, 'COMPANY_NAME');

        // Round-robin assignment to a pre-sales user
        const assignedUserId = await roundRobinService.getNextPreSalesUser(organization);

        // Build the acquired source tracking object
        const acquired = {
            campaign: String(data.campaign_id || ''),
            source: 'Google Ads',
            sub_source: String(data.form_id || ''),
            received: new Date(),
            created_at: new Date(),
            medium: 'Google Lead Form',
        };

        // Collect all custom question answers as requirements array
        const customFields = ['FULL_NAME', 'EMAIL', 'PHONE_NUMBER', 'COMPANY_NAME', 'OVER_18_AGE'];
        const requirements = cols
            .filter(f => !customFields.includes(f.column_id) && f.string_value)
            .map(f => ({ key: f.column_id, value: f.string_value }));

        const profile_id = await getNextProfileId(Lead);

        const lead = await Lead.create({
            _id: uuidv4(),
            profile_id,
            organization,
            profile: { name, email, phone },
            acquired: [acquired],
            requirements,
            stage: 'new',
            status: 'active',
            exe_user: assignedUserId || undefined,
            created_at: new Date(),
            updated_at: new Date(),
        });

        console.log(
            `[Google Webhook] Lead created: ${lead._id} | Name: ${name} | Org: ${organization} | Assigned to: ${assignedUserId || 'unassigned'}`
        );

        return { lead, assignedUserId };
    }

    /**
     * Save the raw event payload to the org's DB for audit/replay purposes.
     * (fire-and-forget — non-blocking)
     */
    async saveRawEvent(organization, eventType, payload) {
        try {
            const orgConn = await getOrganizationConnection(organization);
            const GoogleWebhookEvent = getGoogleWebhookEventModel(orgConn);
            await GoogleWebhookEvent.create({ organization, eventType, payload });
        } catch (err) {
            console.error('[Google Webhook] Failed to save raw event:', err.message);
        }
    }
}

export const googleWebhookService = new GoogleWebhookService();
