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
}

export const leadService = new LeadService();
