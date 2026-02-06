import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadModel } from '../models/lead.model.js';
import { AppError } from '../utils/apiResponse.util.js';
import mongoose from 'mongoose';

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

    async getLeadById(organization, id) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!id) {
            throw new AppError('Lead ID is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            // Try to find by ObjectId first, then by profile_id
            let lead;
            if (mongoose.Types.ObjectId.isValid(id)) {
                lead = await Lead.findById(id).lean();
            }

            // If not found by ObjectId, try finding by profile_id
            if (!lead) {
                const profileId = parseInt(id, 10);
                if (!isNaN(profileId)) {
                    lead = await Lead.findOne({ profile_id: profileId }).lean();
                }
            }

            if (!lead) {
                return null;
            }

            // Transform dates to strings for GraphQL
            const transformAcquired = (acquired) => {
                if (!acquired || !Array.isArray(acquired)) return [];
                return acquired.map(item => ({
                    ...item,
                    _id: item._id?.toString() || '',
                    received: item.received ? new Date(item.received).toISOString() : '',
                    created_at: item.created_at ? new Date(item.created_at).toISOString() : '',
                }));
            };

            return {
                _id: lead._id.toString(),
                profile_id: lead.profile_id,
                organization: lead.organization,
                profile: lead.profile || null,
                stage: lead.stage,
                prefered: lead.prefered || null,
                pretype: lead.pretype || null,
                bathroom: lead.bathroom || 0,
                parking: lead.parking || 0,
                project: lead.project || [],
                floor: lead.floor || '',
                facing: lead.facing || '',
                merge_id: lead.merge_id || [],
                acquired: transformAcquired(lead.acquired),
                createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : '',
                updatedAt: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : '',
            };
        } catch (err) {
            throw new AppError('Failed to fetch lead: ' + err.message, 500);
        }
    }
}

export const leadService = new LeadService();

