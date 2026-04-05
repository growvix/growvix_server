import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadModel } from '../models/lead.model.js';
import { getLeadActivityModel } from '../models/leadActivity.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { getCpUserModel } from '../models/cpUser.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class DashboardService {
    /**
     * Helper to resolve the local organization user IDs (UUID and profile_id)
     * based on the global user's email or ID.
     */
    async _getEffectiveUserIds(orgConn, user) {
        if (!user) return null;
        const ClientUser = getClientUserModel(orgConn);
        
        // Find the user in the organization's database
        const email = user.email || user.profile?.email;
        const orgUser = await ClientUser.findOne({ 
            $or: [
                { globalUserId: user._id },
                { profile_id: user.profile_id },
                { "profile.email": email }
            ] 
        }).select('_id profile_id').lean();

        if (!orgUser) return { ids: [user._id] };

        const ids = [orgUser._id.toString(), String(orgUser.profile_id)];
        // Add global ID as well just in case
        if (user._id && !ids.includes(user._id.toString())) {
            ids.push(user._id.toString());
        }
        return { ids };
    }

    /**
     * Get admin dashboard stats: total leads, new enquiries, reengaged, missed calls, missed followups, active prospects
     */
    async getAdminStats(organization, user = null) {
        if (!organization) throw new AppError('Organization is required', 400);

        const orgConn = await getOrganizationConnection(organization);
        const Lead = getLeadModel(orgConn);

        // Role-based filtering
        const role = user?.role?.toLowerCase();
        const isAdmin = role === 'admin' || role === 'manager';
        const baseQuery = {};
        if (!isAdmin && user) {
            const userFilter = await this._getEffectiveUserIds(orgConn, user);
            if (userFilter) {
                baseQuery.exe_user = { $in: userFilter.ids };
            }
        }

        const [
            allLeads,
            newEnquiries,
            reengagedLeads,
            activeProspects,
            missedFollowups,
        ] = await Promise.all([
            Lead.countDocuments({ ...baseQuery }),
            Lead.countDocuments({ ...baseQuery, stage: { $in: ['new lead', 'New Lead', 'new_lead', 'New'] } }),
            Lead.countDocuments({ ...baseQuery, stage: { $in: ['reengaged', 'Reengaged', 're-engaged'] } }),
            Lead.countDocuments({ ...baseQuery, stage: { $in: ['prospect', 'Prospect', 'active prospect'] } }),
            Lead.countDocuments({ ...baseQuery, stage: { $in: ['missed followup', 'Missed Followup', 'missed_followup'] } }),
        ]);

        // Missed calls - check lead activities for missed call entries
        let missedCalls = 0;
        try {
            const LeadActivity = getLeadActivityModel(orgConn);
            const missedCallQuery = { updates: { $regex: /missed.*call/i } };
            if (!isAdmin && user) {
                const userFilter = await this._getEffectiveUserIds(orgConn, user);
                if (userFilter) {
                    // For missed calls, we filter by leads assigned to this user OR activities logged by them
                    const userLeads = await Lead.find({ exe_user: { $in: userFilter.ids } }).select('_id').lean();
                    const leadIds = userLeads.map(l => l._id);
                    missedCallQuery.$or = [
                        { lead_id: { $in: leadIds } },
                        { user_id: { $in: userFilter.ids } }
                    ];
                }
            }
            missedCalls = await LeadActivity.countDocuments(missedCallQuery);
        } catch (_) {
            missedCalls = 0;
        }

        return {
            allLeads,
            reengagedLeads,
            newEnquiries,
            activeProspects,
            missedCalls,
            missedFollowups,
        };
    }

    /**
     * Get sales summary - site visit done count, sales taken count
     * Filtered by date range and optionally by executive
     */
    async getSalesSummary(organization, startDate, endDate, executiveId, user = null) {
        if (!organization) throw new AppError('Organization is required', 400);

        const orgConn = await getOrganizationConnection(organization);
        const Lead = getLeadModel(orgConn);

        // Role-based filtering
        const role = user?.role?.toLowerCase();
        const isAdmin = role === 'admin' || role === 'manager';
        let effectiveUserFilter = null;
        if (!isAdmin && user) {
            effectiveUserFilter = await this._getEffectiveUserIds(orgConn, user);
        } else if (executiveId) {
            effectiveUserFilter = { ids: [executiveId] };
        }

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        const baseQuery = {};
        if (effectiveUserFilter) baseQuery.exe_user = { $in: effectiveUserFilter.ids };

        // For counts like Site Visit Done and Booking Done, we should ideally look at when they reached that stage.
        // If a date range is provided, we'll check updatedAt as a fallback for "activity happened in this range".
        const timeField = Object.keys(dateFilter).length > 0 ? 'updatedAt' : null;
        const getTimeFilter = () => timeField ? { [timeField]: dateFilter } : {};

        const [siteVisitDone, salesTaken] = await Promise.all([
            Lead.countDocuments({
                ...baseQuery,
                ...getTimeFilter(),
                stage: { $in: ['site visit done', 'Site Visit Done', 'sv done', 'Site visit done', 'Site Visit Completed', 'SV Done'] },
            }),
            Lead.countDocuments({
                ...baseQuery,
                ...getTimeFilter(),
                stage: { $in: ['booking done', 'Booking Done', 'booked', 'Booked', 'sales done', 'Sales Done', 'converted', 'Booking done'] },
            }),
        ]);

        return { siteVisitDone, salesTaken };
    }

    /**
     * Get pre-sales summary - new lead, reengaged, lost, site visit done/schedule, prospect, follow ups
     * Filtered by date range and optionally by executive
     */
    async getPreSalesSummary(organization, startDate, endDate, executiveId, user = null) {
        if (!organization) throw new AppError('Organization is required', 400);

        const orgConn = await getOrganizationConnection(organization);
        const Lead = getLeadModel(orgConn);

        // Role-based filtering
        const role = user?.role?.toLowerCase();
        const isAdmin = role === 'admin' || role === 'manager';
        let effectiveUserFilter = null;
        if (!isAdmin && user) {
            effectiveUserFilter = await this._getEffectiveUserIds(orgConn, user);
        } else if (executiveId) {
            effectiveUserFilter = { ids: [executiveId] };
        }

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        const baseQuery = {};
        if (effectiveUserFilter) baseQuery.exe_user = { $in: effectiveUserFilter.ids };

        // Date filtering logic:
        // New leads should use createdAt.
        // Progress-based stages (SV, Prospect, etc.) should use updatedAt when a date range is specified.
        const getTimeFilter = (isNew = false) => {
            if (Object.keys(dateFilter).length === 0) return {};
            return { [isNew ? 'createdAt' : 'updatedAt']: dateFilter };
        };

        const [newLead, reengaged, lost, siteVisitDone, siteVisitSchedule, prospect, followUps] = await Promise.all([
            Lead.countDocuments({ ...baseQuery, ...getTimeFilter(true), stage: { $in: ['new lead', 'New Lead', 'new_lead', 'New'] } }),
            Lead.countDocuments({ ...baseQuery, ...getTimeFilter(), stage: { $in: ['reengaged', 'Reengaged', 're-engaged'] } }),
            Lead.countDocuments({ ...baseQuery, ...getTimeFilter(), stage: { $in: ['lost', 'Lost', 'dead', 'Lost Lead'] } }),
            Lead.countDocuments({ ...baseQuery, ...getTimeFilter(), stage: { $in: ['site visit done', 'Site Visit Done', 'sv done', 'Site visit done', 'Site Visit Completed', 'SV Done'] } }),
            Lead.countDocuments({ ...baseQuery, ...getTimeFilter(), stage: { $in: ['site visit schedule', 'Site Visit Schedule', 'site visit scheduled', 'sv scheduled', 'Site visit schedule', 'SV Scheduled'] } }),
            Lead.countDocuments({ ...baseQuery, ...getTimeFilter(), stage: { $in: ['prospect', 'Prospect', 'active prospect', 'Active Prospect'] } }),
            Lead.countDocuments({ ...baseQuery, ...getTimeFilter(), stage: { $in: ['follow up', 'Follow Up', 'follow_up', 'followup', 'Followup', 'Follow-up'] } }),
        ]);

        return { newLead, reengaged, lost, siteVisitDone, siteVisitSchedule, prospect, followUps };
    }

    /**
     * Get marketing summary - group leads by source based on the selected campaign category (online/source, offline, channel partner)
     */
    async getMarketingSummary(organization, startDate, endDate, campaignCategory, user = null) {
        if (!organization) throw new AppError('Organization is required', 400);

        const orgConn = await getOrganizationConnection(organization);
        const Lead = getLeadModel(orgConn);

        // Role-based filtering
        const role = user?.role?.toLowerCase();
        const isAdmin = role === 'admin' || role === 'manager';
        const baseQuery = {};
        if (!isAdmin && user) {
            const userFilter = await this._getEffectiveUserIds(orgConn, user);
            if (userFilter) {
                baseQuery.exe_user = { $in: userFilter.ids };
            }
        }

        // Filter preparation
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        const matchCondition = { ...baseQuery };
        if (Object.keys(dateFilter).length > 0) {
            matchCondition.createdAt = dateFilter;
        }
        const cat = (campaignCategory || '').toLowerCase().trim();

        // Robust Aggregation Pipeline
        const aggregation = [{ $match: matchCondition }];

        // We will group by the entire acquired object or raw root variables, 
        // letting JS handle the type safety to prevent Mongo errors.
        if (cat === 'channel partner' || cat === 'channel_partner' || cat === 'cp') {
            aggregation.push({
                $match: {
                    $or: [
                        { cp_name: { $exists: true, $ne: null } },
                        { cpName: { $exists: true, $ne: null } },
                        { "acquired.campaign": { $regex: /channel|cp/i } },
                        { "acquired.source": { $regex: /channel|cp/i } }
                    ]
                }
            });
            // Just push out the raw document variables we need to resolve in JS
            aggregation.push({
                $group: {
                    _id: {
                        cp_name: "$cp_name",
                        cpName: "$cpName",
                        acq_cp_name: { $arrayElemAt: ["$acquired.cp_name", 0] },
                        acq_source: { $arrayElemAt: ["$acquired.source", 0] }
                    },
                    count: { $sum: 1 }
                }
            });
        } else if (cat) {
            aggregation.push({ $unwind: "$acquired" });
            aggregation.push({ $match: { "acquired.campaign": { $regex: new RegExp(cat, 'i') } } });
            aggregation.push({ 
                $group: { 
                    _id: { acq_source: "$acquired.source" }, 
                    count: { $sum: 1 } 
                } 
            });
        } else {
            aggregation.push({ $unwind: { path: "$acquired", preserveNullAndEmptyArrays: true } });
            aggregation.push({ 
                $group: { 
                    _id: { acq_source: "$acquired.source", source: "$source" }, 
                    count: { $sum: 1 } 
                } 
            });
        }

        const rawResults = await Lead.aggregate(aggregation);

        // Process logic safely in JS
        const resultsMap = new Map();
        
        rawResults.forEach(r => {
            let keyStr = 'Unknown';
            if (cat === 'channel partner' || cat === 'channel_partner' || cat === 'cp') {
                const id = r._id || {};
                const name = id.cp_name || id.cpName || id.acq_cp_name;
                keyStr = name ? String(name) : 'Unknown CP';
            } else if (cat) {
                const id = r._id || {};
                keyStr = id.acq_source ? String(id.acq_source) : 'Other';
            } else {
                const id = r._id || {};
                const src = id.acq_source || id.source;
                keyStr = src ? String(src) : 'Direct/Other';
            }
            const lowKey = keyStr.toLowerCase().trim();
            const current = resultsMap.get(lowKey) || 0;
            resultsMap.set(lowKey, current + r.count);
        });

        // Convert mapped results back to array format
        const results = Array.from(resultsMap.entries()).map(([k, count]) => ({ _id: k, count }));

        const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F43F5E', '#3B82F6', '#D946EF', '#84CC16'];
        
        const formatLabel = (val) => {
            if (!val) return 'Unknown';
            return String(val).replace(/\b\w/g, l => l.toUpperCase());
        };

        if (cat === 'channel partner' || cat === 'channel_partner' || cat === 'cp') {
            const CpUser = getCpUserModel(orgConn);
            const cpUsers = await CpUser.find({ isActive: true }).select('profile.firstName profile.lastName').lean();
            
            const cpMap = new Map();
            cpUsers.forEach(u => {
                const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim();
                if (name) cpMap.set(name.toLowerCase(), name);
            });

            const formattedMap = new Map();
            results.forEach(r => {
                const key = String(r._id).toLowerCase().trim();
                const realName = cpMap.get(key) || formatLabel(r._id);
                // Exclude the fallback "Unknown CP" if we strictly want pure CPs, but keeping it shows unmatched leads
                formattedMap.set(key, { label: realName, value: r.count || 0 });
            });

            // Add missing CPs with 0 value
            cpMap.forEach((realName, key) => {
                if (!formattedMap.has(key)) {
                    formattedMap.set(key, { label: realName, value: 0 });
                }
            });

            let merged = Array.from(formattedMap.values());
            // Optionally sort to put highest counts first
            merged.sort((a, b) => b.value - a.value);
            
            return merged.map((item, index) => ({
                label: item.label,
                value: item.value,
                color: colors[index % colors.length]
            }));
        }

        const formatted = results.map((item, index) => ({
            label: formatLabel(item._id),
            value: item.count || 0,
            color: colors[index % colors.length]
        }));

        // Fallbacks for zero results
        if (formatted.length === 0) {
            if (cat === 'online' || cat === 'source') {
                return [
                    { label: 'Facebook', value: 0, color: colors[0] },
                    { label: 'Instagram', value: 0, color: colors[1] },
                    { label: 'Google', value: 0, color: colors[2] },
                ];
            }
            // Ensure All Campaigns always shows something even if empty
            return [{ label: 'Direct', value: 0, color: colors[0] }];
        }

        return formatted;
    }

    /**
     * Get executives list for an organization with department info
     */
    async getExecutives(organization) {
        if (!organization) throw new AppError('Organization is required', 400);

        const orgConn = await getOrganizationConnection(organization);
        const ClientUser = getClientUserModel(orgConn);

        const users = await ClientUser.find({ isActive: true })
            .select('_id profile_id profile role department')
            .lean();

        // Fallback: Populate missing profile images from global User collection
        const { User } = await import('../models/user.model.js');
        const profileIds = users.filter(u => !u.profile?.profileImagePath).map(u => u.profile_id);
        
        let globalUsersRel = [];
        if (profileIds.length > 0) {
            globalUsersRel = await User.find({ profile_id: { $in: profileIds } }).select('profile_id profile.profileImagePath').lean();
        }

        const globalImageMap = new Map(globalUsersRel.map(gu => [gu.profile_id, gu.profile?.profileImagePath]));

        return users.map(u => ({
            id: u._id?.toString() || '',
            profile_id: u.profile_id,
            name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || 'Unknown',
            role: u.role || 'user',
            department: u.department || '',
            profileImagePath: u.profile?.profileImagePath || globalImageMap.get(u.profile_id) || '',
        }));
    }
}

export const dashboardService = new DashboardService();
