// gRPC/Connect Lead Service Implementation
import { leadService } from '../services/lead.service.js';

/**
 * GetAllLeads handler for Connect RPC
 * @param {Object} req - Request object containing organization
 * @returns {Object} Response with leads array
 */
export async function getAllLeads(req) {
    const { organization } = req;

    if (!organization) {
        throw new Error('Organization is required');
    }

    const leads = await leadService.getAllLeads(organization);

    // Transform to match proto schema
    return {
        leads: leads.map(lead => ({
            profileId: lead.profile_id,
            name: lead.name || '',
            campaign: lead.campaign || '',
            source: lead.source || '',
            subSource: lead.sub_source || '',
            received: lead.received || ''
        }))
    };
}

// Export service handlers
export const leadServiceHandlers = {
    getAllLeads
};
