// gRPC/Connect Lead Service Implementation
import { leadService } from '../services/lead.service.js';

/**
 * GetAllLeads handler for Connect RPC
 * @param {Object} req - Request object containing organization
 * @returns {Object} Response with leads array
 */
export async function getAllLeads(req) {
    const { organization, filters } = req;

    if (!organization) {
        throw new Error('Organization is required');
    }

    const leads = await leadService.getAllLeads(organization, filters || {});

    return {
        leads: leads.map(lead => ({
            lead_id: lead.lead_id,
            profile_id: lead.profile_id,
            name: lead.name || '',
            campaign: lead.campaign || '',
            source: lead.source || '',
            sub_source: lead.sub_source || '',
            received: lead.received || ''
        }))
    };
}

// Export service handlers
export const leadServiceHandlers = {
    getAllLeads
};
