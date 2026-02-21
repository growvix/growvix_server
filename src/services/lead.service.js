import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadModel } from '../models/lead.model.js';
import { AppError } from '../utils/apiResponse.util.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

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

            // Set default stage to 1 (new lead) if not provided
            if (data.stage === undefined || data.stage === null) {
                data.stage = "new lead";
            }

            // Assign UUID v4 as _id
            data._id = uuidv4();

            const lead = await Lead.create(data);
            return lead;
        } catch (err) {
            throw new AppError('Failed to add lead: ' + err.message, 500);
        }
    }

    async getAllLeads(organization, filters = {}) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            // Build query from filters
            const query = {};
            if (filters.name) {
                query['profile.name'] = { $regex: filters.name, $options: 'i' };
            }
            if (filters.source) {
                query['acquired.source'] = { $regex: filters.source, $options: 'i' };
            }
            if (filters.campaign) {
                query['acquired.campaign'] = { $regex: filters.campaign, $options: 'i' };
            }
            if (filters.status) {
                query['status'] = filters.status;
            }

            const leads = await Lead.find(query).lean();
            return leads.map(lead => {
                const receivedValue = lead.acquired?.[0]?.received;
                let receivedStr = '';
                if (receivedValue) {
                    const date = receivedValue instanceof Date ? receivedValue : new Date(receivedValue);
                    receivedStr = !isNaN(date.getTime()) ? date.toISOString() : String(receivedValue);
                }

                return {
                    lead_id: lead._id.toString(),
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

            // Find by UUID _id first, then fall back to profile_id
            let lead;
            try {
                lead = await Lead.findById(id).lean();
            } catch {
                // id is not a valid ObjectId (e.g. a plain number) — skip to profile_id lookup
                lead = null;
            }

            // If not found by _id, try finding by profile_id
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
                status: lead.status,
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

    async updateLead(organization, id, updateData) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!id) {
            throw new AppError('Lead ID is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            // Build update object from allowed fields only
            const allowedFields = ['stage', 'status'];
            const update = {};
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    update[field] = updateData[field];
                }
            }

            if (Object.keys(update).length === 0) {
                throw new AppError('No valid fields to update', 400);
            }

            const lead = await Lead.findByIdAndUpdate(id, update, { new: true }).lean();

            if (!lead) {
                throw new AppError('Lead not found', 404);
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
                status: lead.status,
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
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to update lead: ' + err.message, 500);
        }
    }
}

export const leadService = new LeadService();

