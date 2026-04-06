// gRPC/Connect Lead Service Implementation
import { leadService } from '../services/lead.service.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getClientUserModel } from '../models/clientUser.model.js';

/**
 * GetAllLeads handler for Connect RPC
 * @param {Object} req - Request object containing organization, filters, offset, limit
 * @returns {Object} Response with leads array and total count
 */
export async function getAllLeads(req, user) {
    const { organization, filters, offset = 0, limit = 30 } = req;

    if (!organization) {
        throw new Error('Organization is required');
    }

    const result = await leadService.getAllLeads(organization, filters || {}, { offset, limit, user });
    const { leads, total } = result;

    // Batch-resolve exe_user_name
    let userMap = {};
    try {
        const exeUserIds = [...new Set(leads.filter(l => l.exe_user).map(l => l.exe_user))];
        
        if (exeUserIds.length > 0) {
            const orgConn = await getOrganizationConnection(organization);
            const ClientUser = getClientUserModel(orgConn);
            const internalUsers = await ClientUser.find({ _id: { $in: exeUserIds } }).select('_id profile').lean();
            
            internalUsers.forEach(u => {
                userMap[u._id.toString()] = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim();
            });
        }
    } catch (err) {
        console.error('Failed to resolve names in gRPC:', err.message);
    }

    return {
        leads: leads.map(lead => {
            return {
                lead_id: lead.lead_id,
                profile_id: lead.profile_id,
                name: lead.name || '',
                phone: lead.phone || '',
                email: lead.email || '',
                stage: lead.stage || '',
                status: lead.status || '',
                campaign: lead.campaign || '',
                source: lead.source || '',
                sub_source: lead.sub_source || '',
                received: lead.received || '',
                exe_user: lead.exe_user || '',
                exe_user_name: lead.exe_user ? (userMap[lead.exe_user] || '') : '',
                is_secondary: !!lead.is_secondary,
                merged_into: lead.merged_into || null,
            };
        }),
        total,
    };
}

// Export service handlers
export const leadServiceHandlers = {
    getAllLeads
};
