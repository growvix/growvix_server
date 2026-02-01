import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadModel } from '../models/lead.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class LeadService {
    async addLead(data) {
        const organization = data.organization;
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            // Auto-generate sequential profile_id
            const lastLead = await Lead.findOne().sort({ profile_id: -1 }).select('profile_id');
            const nextProfileId = lastLead ? lastLead.profile_id + 1 : 1;
            data.profile_id = nextProfileId;

            const lead = await Lead.create(data);
            return lead;
        } catch (err) {
            throw new AppError('Failed to add lead: ' + err.message, 500);
        }
    }

    async getAllLeads(organization) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            const leads = await Lead.find({}).lean();

            // Transform leads to the required format for table display
            return leads.map(lead => {
                const receivedValue = lead.acquired?.[0]?.received;
                let receivedStr = '';
                if (receivedValue) {
                    // Handle Date objects, strings, or timestamps
                    const date = receivedValue instanceof Date ? receivedValue : new Date(receivedValue);
                    receivedStr = !isNaN(date.getTime()) ? date.toISOString() : String(receivedValue);
                }
                return {
                    profile_id: lead.profile_id,
                    name: lead.profile?.name || '',
                    campaign: lead.acquired?.[0]?.campaign || '',
                    source: lead.acquired?.[0]?.source || '',
                    sub_source: lead.acquired?.[0]?.sub_source || '',
                    received: receivedStr,
                };
            });
        } catch (err) {
            throw new AppError('Failed to fetch leads: ' + err.message, 500);
        }
    }
}

export const leadService = new LeadService();

