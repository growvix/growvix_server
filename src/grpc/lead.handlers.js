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

    // Batch-resolve exe_user_name (including CP and Global fallbacks)
    let userMap = {};
    try {
        const userIds = [...new Set([
            ...leads.map(l => l.exe_user),
            ...leads.map(l => l.cp_user)
        ].filter(Boolean))];
        
        if (userIds.length > 0) {
            const orgConn = await getOrganizationConnection(organization);
            const ClientUser = getClientUserModel(orgConn);
            const { getCpUserModel } = await import('../models/cpUser.model.js');
            const { User } = await import('../models/user.model.js');
            const CpUser = getCpUserModel(orgConn);
            
            // 1. Fetch from ClientUser (Organization-specific)
            const clientUsers = await ClientUser.find({ _id: { $in: userIds } }).select('_id profile profile_id').lean();
            clientUsers.forEach(u => {
                const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.profile?.email || 'Unknown';
                userMap[u._id.toString()] = name;
                userMap[u.profile_id?.toString()] = name;
            });

            // 2. Fetch from CpUser (Organization-specific)
            const cpUsers = await CpUser.find({ _id: { $in: userIds } }).select('_id profile profile_id').lean();
            cpUsers.forEach(u => {
                const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.profile?.email || 'Unknown';
                userMap[u._id.toString()] = name;
                userMap[u.profile_id?.toString()] = name;
            });

            // 3. Identify missing for fallback
            const stillMissing = userIds.filter(id => id && !userMap[id.toString()]);
            if (stillMissing.length > 0) {
                const potentialProfileIds = stillMissing.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
                const uuidMissing = stillMissing.filter(id => isNaN(parseInt(id, 10)));

                // 3.a. Global lookup by UUID
                if (uuidMissing.length > 0) {
                    const globalUsers = await User.find({ _id: { $in: uuidMissing } }).select('_id profile profile_id').lean();
                    globalUsers.forEach(u => {
                        const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.profile?.email || 'Unknown';
                        userMap[u._id.toString()] = name;
                    });
                }

                // 3.b. Global lookup by profile_id
                if (potentialProfileIds.length > 0) {
                    const globalByProf = await User.find({ profile_id: { $in: potentialProfileIds } }).select('_id profile profile_id').lean();
                    globalByProf.forEach(u => {
                        const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.profile?.email || 'Unknown';
                        userMap[u._id.toString()] = name;
                        userMap[u.profile_id.toString()] = name;
                    });
                }
            }
        }
    } catch (err) {
        console.error('Failed to resolve names in gRPC:', err.message);
    }

    return {
        leads: leads.map(lead => {
            const exeId = lead.exe_user?.toString();
            const cpId = lead.cp_user?.toString();
            const resolvedName = (exeId ? userMap[exeId] : '') || (cpId ? userMap[cpId] : '');
            
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
                exe_user_name: resolvedName || (exeId || cpId || ''),
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
