import { GoogleConfig } from '../models/googleConfig.model.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadModel } from '../models/lead.model.js';
import { getGoogleWebhookEventModel } from '../models/googleWebhookEvent.model.js';
import { roundRobinService } from './roundRobin.service.js';
import { leadService } from './lead.service.js';
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
     * STEP 2 (LEGACY): Process the lead using hardcoded field mapping.
     */
    async processLeadFormSubmission(organization, data) {
        const orgConn = await getOrganizationConnection(organization);
        const Lead = getLeadModel(orgConn);

        const cols = data.user_column_data || [];

        const name = getField(cols, 'FULL_NAME') || `Google Lead`;
        let email = getField(cols, 'EMAIL');
        let phone = getField(cols, 'PHONE_NUMBER');

        if (email) email = email.toLowerCase().trim();
        if (phone) phone = phone.replace(/[\s\-\(\)]/g, '').trim();

        const assignedUserId = await roundRobinService.getNextPreSalesUser(organization);

        const acquired = {
            campaign: String(data.campaign_id || ''),
            source: 'Google Ads',
            sub_source: String(data.form_id || ''),
            received: new Date(),
            created_at: new Date(),
            medium: 'Google Lead Form',
        };

        const customFields = ['FULL_NAME', 'EMAIL', 'PHONE_NUMBER', 'COMPANY_NAME', 'OVER_18_AGE'];
        const requirements = cols
            .filter(f => !customFields.includes(f.column_id) && f.string_value)
            .map(f => ({ key: f.column_id, value: f.string_value }));

        const leadData = {
            organization,
            profile: { name, email, phone },
            acquired: [acquired],
            requirements,
            stage: 'new lead',
            status: 'No Activity',
            exe_user: assignedUserId || undefined,
        };

        const lead = await leadService.addLead(leadData);

        console.log(
            `[Google Webhook] Lead created: ${lead._id} | Name: ${name} | Org: ${organization} | Assigned to: ${assignedUserId || 'unassigned'}`
        );

        return { lead, assignedUserId };
    }

    /**
     * STEP 2 (NEW): Process the lead using saved field_mapping from google_mapping.
     * Maps Google fields to CRM fields dynamically based on user configuration.
     */
    async processLeadWithMapping(organization, data, integration, mapping) {
        const orgConn = await getOrganizationConnection(organization);
        const Lead = getLeadModel(orgConn);

        const cols = data.user_column_data || [];
        const fieldMap = mapping?.field_mapping || [];

        // Build profile and requirements from mapping
        const profile = { name: 'Google Lead' };
        const requirements = [];

        for (const col of cols) {
            const mapEntry = fieldMap.find(m => m.google_field === col.column_id);
            const value = col.string_value || '';

            if (!value) continue;

            if (mapEntry && mapEntry.crm_field !== 'requirement') {
                // Mapped to a CRM field (e.g. "profile.name", "profile.email", "profile.phone", "profile.location")
                const parts = mapEntry.crm_field.split('.');
                if (parts[0] === 'profile' && parts[1]) {
                    let cleanedValue = value;
                    if (parts[1] === 'phone') cleanedValue = String(value).replace(/[\s\-\(\)]/g, '').trim();
                    if (parts[1] === 'email') cleanedValue = String(value).toLowerCase().trim();
                    profile[parts[1]] = cleanedValue;
                }
            } else {
                // Unmapped or explicitly marked as requirement
                requirements.push({
                    key: mapEntry?.google_label || col.column_id,
                    value,
                });
            }
        }

        // Ensure required fields have fallbacks
        if (!profile.name || profile.name === 'Google Lead') {
            profile.name = 'Google Lead';
        }
        if (!profile.phone) {
            profile.phone = 'N/A';
        }

        const assignedUserId = await roundRobinService.getNextPreSalesUser(organization);

        const acquired = {
            campaign: String(integration.campaign_id || ''),
            source: integration.source || 'Google Ads',
            sub_source: integration.sub_source || String(data.form_id || ''),
            received: new Date(),
            created_at: new Date(),
            medium: 'Google Lead Form',
        };

        const leadData = {
            organization,
            profile,
            acquired: [acquired],
            requirements,
            stage: 'new lead',
            status: 'No Activity',
            exe_user: assignedUserId || undefined,
        };

        const lead = await leadService.addLead(leadData);

        console.log(
            `[Google Webhook] Lead created (mapped): ${lead._id} | Name: ${profile.name} | Org: ${organization} | Assigned to: ${assignedUserId || 'unassigned'}`
        );

        return { lead, assignedUserId };
    }

    /**
     * Save the raw event payload to the org's DB for audit/replay purposes.
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
