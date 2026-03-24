// gRPC/Connect Lead Service Implementation
import { leadService } from '../services/lead.service.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getClientUserModel } from '../models/clientUser.model.js';

/**
 * GetAllLeads handler for Connect RPC
 * @param {Object} req - Request object containing organization, filters, offset, limit
 * @returns {Object} Response with leads array and total count
 */
export async function getAllLeads(req) {
    const { organization, filters, offset = 0, limit = 30 } = req;

    if (!organization) {
        throw new Error('Organization is required');
    }

    const result = await leadService.getAllLeads(organization, filters || {}, { offset, limit });
    const { leads, total } = result;

    // Batch-resolve exe_user_name
    let userMap = {};
    try {
        const userIds = [...new Set(leads.filter(l => l.exe_user).map(l => l.exe_user))];
        if (userIds.length > 0) {
            const orgConn = await getOrganizationConnection(organization);
            const ClientUser = getClientUserModel(orgConn);
            const users = await ClientUser.find({ _id: { $in: userIds } }).select('_id profile').lean();
            users.forEach(u => {
                userMap[u._id.toString()] = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim();
            });
        }
    } catch (err) {
        console.error('Failed to resolve exe_user names in gRPC:', err.message);
    }

    return {
        leads: leads.map(lead => ({
            lead_id: lead.lead_id,
            profile_id: lead.profile_id,
            name: lead.name || '',
            phone: lead.phone || '',
            stage: lead.stage || '',
            status: lead.status || '',
            campaign: lead.campaign || '',
            source: lead.source || '',
            sub_source: lead.sub_source || '',
            received: lead.received || '',
            exe_user: lead.exe_user || '',
            exe_user_name: lead.exe_user ? (userMap[lead.exe_user] || '') : '',
        })),
        total,
    };
}

// Export service handlers
export const leadServiceHandlers = {
    getAllLeads
};
