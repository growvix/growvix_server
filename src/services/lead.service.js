import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadModel } from '../models/lead.model.js';
import { AppError } from '../utils/apiResponse.util.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { roundRobinService } from './roundRobin.service.js';

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

            // Round-robin: assign to next pre-sales user
            try {
                const assignedUserId = await roundRobinService.getNextPreSalesUser(organization);
                if (assignedUserId) {
                    data.exe_user = assignedUserId;
                }
            } catch (rrErr) {
                console.error('Round-robin assignment failed (lead will be unassigned):', rrErr.message);
            }

            const lead = await Lead.create(data);
            return lead;
        } catch (err) {
            throw new AppError('Failed to add lead: ' + err.message, 500);
        }
    }

    async getAllLeads(organization, filters = {}, { offset = 0, limit = 30 } = {}) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            // Sanitize pagination params
            const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
            const safeLimit = Math.max(1, parseInt(limit, 10) || 30);

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
            if (filters.status && filters.status !== 'undefined') {
                query['status'] = filters.status;
            }
            if (filters.assignedTo && filters.assignedTo !== 'undefined' && filters.assignedTo !== 'all') {
                query['exe_user'] = filters.assignedTo;
            }
            if (filters.stage && filters.stage !== 'undefined') {
                query['stage'] = filters.stage;
            }
            if (filters.receivedOn && filters.receivedOn !== 'undefined') {
                const date = new Date(filters.receivedOn);
                if (!isNaN(date.getTime())) {
                    const startOfDay = new Date(date);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(date);
                    endOfDay.setHours(23, 59, 59, 999);
                    query['acquired.received'] = { $gte: startOfDay, $lte: endOfDay };
                }
            }

            // Run count and paginated query in parallel
            const [total, leads] = await Promise.all([
                Lead.countDocuments(query),
                Lead.find(query).sort({ profile_id: -1 }).skip(safeOffset).limit(safeLimit).lean(),
            ]);

            const mappedLeads = leads.map(lead => {
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
                    phone: lead.profile?.phone || '',
                    stage: lead.stage || '',
                    status: lead.status || '',
                    campaign: lead.acquired?.[0]?.campaign || '',
                    source: lead.acquired?.[0]?.source || '',
                    sub_source: lead.acquired?.[0]?.sub_source || '',
                    received: receivedStr,
                    exe_user: lead.exe_user ? lead.exe_user.toString() : '',
                };
            });

            return { leads: mappedLeads, total };
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
                propertyRequirement: lead.requirement ? {
                    sqft: lead.requirement.sqft || null,
                    bhk: lead.requirement.bhk || [],
                    floor: lead.requirement.floor || [],
                    balcony: lead.requirement.balcony || false,
                    bathroom_count: lead.requirement.bathroom_count || null,
                    parking_needed: lead.requirement.parking_needed || false,
                    parking_count: lead.requirement.parking_count || null,
                    price_min: lead.requirement.price_min || null,
                    price_max: lead.requirement.price_max || null,
                    furniture: lead.requirement.furniture || [],
                    facing: lead.requirement.facing || [],
                    plot_type: lead.requirement.plot_type || '',
                } : null,
                project: lead.project || [],
                interested_projects: (lead.interested_projects || []).map(ip => ({
                    project_id: ip.project_id,
                    project_name: ip.project_name,
                })),
                merge_id: lead.merge_id || [],
                acquired: transformAcquired(lead.acquired),
                requirements: (lead.requirements || []).map(r => ({
                    _id: r._id?.toString() || '',
                    key: r.key,
                    value: r.value,
                })),
                exe_user: lead.exe_user ? lead.exe_user.toString() : '',
                createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : '',
                updatedAt: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : '',
                important_activities: (lead.important_activities || []).map(ia => ({
                    activity_id: ia.activity_id,
                    marked_at: ia.marked_at ? new Date(ia.marked_at).toISOString() : '',
                    marked_by: ia.marked_by
                })),
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
            const allowedFields = ['stage', 'status', 'exe_user'];
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

            // Return the full LeadDetail object via getLeadById
            // This ensures all fields match the LeadDetail GraphQL type
            return await this.getLeadById(organization, id);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to update lead: ' + err.message, 500);
        }
    }

    async addRequirement(organization, leadId, key, value) {
        if (!organization) throw new AppError('Organization is required', 400);
        if (!leadId) throw new AppError('Lead ID is required', 400);
        if (!key || !value) throw new AppError('Key and value are required', 400);
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);
            const lead = await Lead.findByIdAndUpdate(
                leadId,
                { $push: { requirements: { key, value } } },
                { new: true }
            ).lean();
            if (!lead) throw new AppError('Lead not found', 404);
            return this.getLeadById(organization, leadId);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to add requirement: ' + err.message, 500);
        }
    }

    async removeRequirement(organization, leadId, requirementId) {
        if (!organization) throw new AppError('Organization is required', 400);
        if (!leadId) throw new AppError('Lead ID is required', 400);
        if (!requirementId) throw new AppError('Requirement ID is required', 400);
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);
            const lead = await Lead.findByIdAndUpdate(
                leadId,
                { $pull: { requirements: { _id: requirementId } } },
                { new: true }
            ).lean();
            if (!lead) throw new AppError('Lead not found', 404);
            return this.getLeadById(organization, leadId);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to remove requirement: ' + err.message, 500);
        }
    }

    async updatePropertyRequirement(organization, leadId, input) {
        if (!organization) throw new AppError('Organization is required', 400);
        if (!leadId) throw new AppError('Lead ID is required', 400);
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            const setFields = {};
            for (const [key, value] of Object.entries(input)) {
                setFields[`requirement.${key}`] = value;
            }

            const lead = await Lead.findByIdAndUpdate(
                leadId,
                { $set: setFields },
                { new: true }
            ).lean();
            if (!lead) throw new AppError('Lead not found', 404);
            return this.getLeadById(organization, leadId);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to update property requirement: ' + err.message, 500);
        }
    }

    async addInterestedProject(organization, leadId, projectId, projectName) {
        if (!organization) throw new AppError('Organization is required', 400);
        if (!leadId) throw new AppError('Lead ID is required', 400);
        if (!projectId) throw new AppError('Project ID is required', 400);
        if (!projectName) throw new AppError('Project name is required', 400);
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            // Use $addToSet to prevent duplicates (match by project_id)
            // First check if project already exists
            const existing = await Lead.findOne({
                _id: leadId,
                'interested_projects.project_id': projectId
            }).lean();
            if (existing) {
                throw new AppError('Project already added to this lead', 400);
            }

            await Lead.findByIdAndUpdate(
                leadId,
                { $push: { interested_projects: { project_id: projectId, project_name: projectName } } },
                { new: true }
            );
            return this.getLeadById(organization, leadId);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to add interested project: ' + err.message, 500);
        }
    }

    async removeInterestedProject(organization, leadId, projectId) {
        if (!organization) throw new AppError('Organization is required', 400);
        if (!leadId) throw new AppError('Lead ID is required', 400);
        if (!projectId) throw new AppError('Project ID is required', 400);
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);
            await Lead.findByIdAndUpdate(
                leadId,
                { $pull: { interested_projects: { project_id: projectId } } },
                { new: true }
            );
            return this.getLeadById(organization, leadId);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to remove interested project: ' + err.message, 500);
        }
    }

    async toggleImportantActivity(organization, leadId, activityId, profileId) {
        if (!organization) throw new AppError('Organization is required', 400);
        if (!leadId) throw new AppError('Lead ID is required', 400);
        if (!activityId) throw new AppError('Activity ID is required', 400);
        if (!profileId) throw new AppError('Profile ID is required', 400);

        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            const lead = await Lead.findById(leadId);
            if (!lead) throw new AppError('Lead not found', 404);

            if (!lead.important_activities) {
                lead.important_activities = [];
            }

            const existingIndex = lead.important_activities.findIndex(ia => ia.activity_id === activityId);

            if (existingIndex > -1) {
                // Remove it
                lead.important_activities.splice(existingIndex, 1);
            } else {
                // Add it
                lead.important_activities.push({
                    activity_id: activityId,
                    marked_by: profileId,
                    marked_at: new Date()
                });
            }

            await lead.save();
            return this.getLeadById(organization, leadId);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to toggle important activity: ' + err.message, 500);
        }
    }
}

export const leadService = new LeadService();

