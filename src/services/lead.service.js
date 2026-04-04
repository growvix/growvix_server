import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getLeadModel } from '../models/lead.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { getBulkUploadModel } from '../models/bulkUpload.model.js';
import { AppError } from '../utils/apiResponse.util.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { roundRobinService } from './roundRobin.service.js';

export class LeadService {
    _maskPhoneNumber(phone) {
        if (!phone || phone === "-" || phone.length <= 2) return phone;
        if (phone.startsWith('***')) return phone; // Already masked
        return `********${phone.slice(-2)}`;
    }

    async addLead(data) {
        // ... (existing addLead remains unchanged above) ...
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

            // Set default status to 'No Activity' if not provided
            if (data.status === undefined || data.status === null) {
                data.status = "No Activity";
            }

            // Assign UUID v4 as _id
            data._id = uuidv4();

            // Round-robin: assign to next pre-sales user if not already provided
            if (!data.exe_user) {
                try {
                    const assignedUserId = await roundRobinService.getNextPreSalesUser(organization);
                    if (assignedUserId) {
                        data.exe_user = assignedUserId;
                    }
                } catch (rrErr) {
                    console.error('Round-robin assignment failed (lead will be unassigned):', rrErr.message);
                }
            }

            const lead = await Lead.create(data);
            return lead;
        } catch (err) {
            throw new AppError('Failed to add lead: ' + err.message, 500);
        }
    }

    async bulkAddLeads(leadsData, organization, userId, options = {}) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        const { hasHeader = true, mappings = null, fileName = '', initiatedByName = '', initiatedByEmail = '' } = options;

        try {
            const orgConn = await getOrganizationConnection(organization);
            const Lead = getLeadModel(orgConn);

            // Find current highest profile_id
            const lastLead = await Lead.findOne().sort({ profile_id: -1 }).select('profile_id');
            let nextProfileId = lastLead ? lastLead.profile_id + 1 : 1;

            const validLeads = [];
            const errors = [];

            // Skip first row if it's a header
            const startIndex = hasHeader ? 1 : 0;

            for (let i = startIndex; i < leadsData.length; i++) {
                const row = leadsData[i];
                if (!row || (Array.isArray(row) && row.length === 0)) continue;

                let name = '';
                let phone = '';
                let email = '';
                let location = '';
                let campaign = '';
                let source = '';
                let subSource = '';
                let medium = '';

                if (mappings) {
                    // Use custom mapping (indices)
                    Object.entries(mappings).forEach(([idx, field]) => {
                        const val = row[idx];
                        if (val === undefined || val === null) return;

                        switch (field) {
                            case 'name': name = val; break;
                            case 'phone': phone = val; break;
                            case 'email': email = val; break;
                            case 'location': location = val; break;
                            case 'campaign': campaign = val; break;
                            case 'source': source = val; break;
                            case 'sub_source': subSource = val; break;
                            case 'medium': medium = val; break;
                        }
                    });
                } else if (!Array.isArray(row)) {
                    // Legacy support: row is an object from sheet_to_json (non-header: 1 mode)
                    name = row['Name'] || row['name'] || row['Lead Name'] || '';
                    phone = row['Phone'] || row['phone'] || row['Phone Number'] || row['Mobile'] || '';
                    email = row['Email'] || row['email'] || row['Email Address'] || '';
                    location = row['Location'] || row['location'] || row['City'] || '';
                    campaign = row['Campaign'] || row['campaign'] || '';
                    source = row['Source'] || row['source'] || '';
                    medium = row['Medium'] || row['medium'] || '';
                    subSource = row['Sub Source'] || row['sub_source'] || '';
                }

                if (!name || !phone) {
                    errors.push({ row: i + 1, error: 'Name and Phone are mandatory.' });
                    continue;
                }

                // Prepare lead object following LeadSchema structure
                const leadDoc = {
                    _id: uuidv4(),
                    profile_id: nextProfileId++,
                    organization: organization,
                    profile: {
                        name: String(name).trim(),
                        email: String(email).trim(),
                        phone: String(phone).trim(),
                        location: String(location).trim()
                    },
                    stage: 'new lead',
                    status: 'No Activity',
                    acquired: []
                };

                if (campaign || source || medium || subSource) {
                    leadDoc.acquired.push({
                        campaign: String(campaign).trim(),
                        source: String(source).trim(),
                        sub_source: String(subSource).trim(),
                        medium: String(medium).trim(),
                        received: new Date(),
                        created_at: new Date()
                    });
                }

                // Assign to user if provided
                if (userId) {
                    // Check if user is pre-sales or similar if needed, otherwise assign
                    leadDoc.exe_user = userId;
                }

                // Optional: round-robin assignment override if exe_user was not provided (uploader)
                if (!leadDoc.exe_user) {
                    try {
                        const assignedUserId = await roundRobinService.getNextPreSalesUser(organization);
                        if (assignedUserId) {
                            leadDoc.exe_user = assignedUserId;
                        }
                    } catch (rrErr) {
                        // Fallback to userId if RR fails
                    }
                }

                validLeads.push(leadDoc);
            }

            let insertedCount = 0;
            if (validLeads.length > 0) {
                const inserted = await Lead.insertMany(validLeads);
                insertedCount = inserted.length;
            }

            // Determine first source/campaign from the data for the batch record
            let batchSource = '';
            let batchCampaign = '';
            if (validLeads.length > 0 && validLeads[0].acquired && validLeads[0].acquired.length > 0) {
                batchSource = validLeads[0].acquired[0].source || '';
                batchCampaign = validLeads[0].acquired[0].campaign || '';
            }

            // Determine status
            let status = 'Success';
            if (insertedCount === 0 && errors.length > 0) status = 'Error';
            else if (errors.length > 0 && insertedCount > 0) status = 'Partial';

            // Save bulk upload record
            const BulkUpload = getBulkUploadModel(orgConn);
            await BulkUpload.create({
                _id: uuidv4(),
                organization,
                fileName: fileName || 'Unknown',
                totalLeads: leadsData.length - startIndex,
                uploadedLeads: insertedCount,
                existingLeads: 0,
                errorLeads: errors.length,
                source: batchSource,
                campaign: batchCampaign,
                initiatedBy: userId || '',
                initiatedByName: initiatedByName || '',
                initiatedByEmail: initiatedByEmail || '',
                status,
                allowReEngage: true,
            });

            return {
                totalRows: leadsData.length - startIndex,
                successCount: insertedCount,
                errorCount: errors.length,
                errors: errors
            };
        } catch (err) {
            throw new AppError('Failed to bulk insert leads: ' + err.message, 500);
        }
    }

    async getAllLeads(organization, filters = {}, { offset = 0, limit = 30, user = null } = {}) {
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
                if (filters.status === 'No Activity') {
                    query['status'] = { $in: ['No Activity', 'Untouched'] };
                } else {
                    query['status'] = filters.status;
                }
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

            const role = user?.role?.toLowerCase();
            const canShowAllPhones = role === 'admin' || role === 'manager';
            
            console.error(`[LeadService DEBUG] user_email=${user?.email || user?.profile?.email}, role=${role}, canShowAllPhones=${canShowAllPhones}`);

            let orgUserId = null;
            if (user && !canShowAllPhones) {
                const email = user.email || user.profile?.email;
                if (email) {
                    const ClientUser = getClientUserModel(orgConn);
                    const orgUser = await ClientUser.findOne({ "profile.email": email }).select('_id').lean();
                    orgUserId = orgUser?._id?.toString();
                    console.error(`[LeadService DEBUG] user email from context: ${email}, Resolved orgUserId: ${orgUserId}`);
                } else {
                    console.error(`[LeadService DEBUG] User object present but no email found:`, JSON.stringify(user));
                }
            }

            const mappedLeads = leads.map(lead => {
                const receivedValue = lead.acquired?.[0]?.received;
                let receivedStr = '';
                if (receivedValue) {
                    const date = receivedValue instanceof Date ? receivedValue : new Date(receivedValue);
                    receivedStr = !isNaN(date.getTime()) ? date.toISOString() : String(receivedValue);
                }

                let phoneValue = lead.profile?.phone || '';
                
                // Final unmasking decision
                let shouldShowFullPhone = false;
                if (canShowAllPhones) {
                    shouldShowFullPhone = true;
                } else if (orgUserId && lead.exe_user && lead.exe_user.toString() === orgUserId) {
                    shouldShowFullPhone = true;
                }

                if (lead.profile_id === 10 || lead.profile_id === 9) {
                    console.error(`[LeadService DEBUG] Lead #${lead.profile_id}: shouldShowFullPhone=${shouldShowFullPhone}, canShowAllPhones=${canShowAllPhones}, orgUserId=${orgUserId}, lead.exe_user=${lead.exe_user}`);
                }

                let finalPhone = phoneValue;
                if (!shouldShowFullPhone && phoneValue && phoneValue !== "-") {
                    finalPhone = this._maskPhoneNumber(phoneValue);
                }

                return {
                    lead_id: lead._id.toString(),
                    profile_id: lead.profile_id,
                    name: lead.profile?.name || '',
                    phone: finalPhone,
                    stage: lead.stage || '',
                    status: lead.status === 'Untouched' ? 'No Activity' : (lead.status || ''),
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

    async getLeadById(organization, id, user = null) {
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

            const role = user?.role?.toLowerCase();
            const canShowAllPhones = role === 'admin' || role === 'manager';
            
            let isAssignedToMe = false;
            if (user && !canShowAllPhones && lead.exe_user) {
                const email = user.email || user.profile?.email;
                if (email) {
                    const ClientUser = getClientUserModel(orgConn);
                    const orgUser = await ClientUser.findOne({ "profile.email": email }).select('_id').lean();
                    if (orgUser && orgUser._id.toString() === lead.exe_user.toString()) {
                        isAssignedToMe = true;
                    }
                }
            }

            let phone = lead.profile?.phone || '';
            if (phone && phone !== "-" && !canShowAllPhones && !isAssignedToMe) {
                phone = this._maskPhoneNumber(phone);
            }

            let exe_user_name = '';
            let exe_user_image = '';
            if (lead.exe_user) {
                const ClientUser = getClientUserModel(orgConn);
                const exeUser = await ClientUser.findById(lead.exe_user).select('profile').lean();
                if (exeUser) {
                    exe_user_name = `${exeUser.profile?.firstName || ''} ${exeUser.profile?.lastName || ''}`.trim() || 'Unknown';
                    exe_user_image = exeUser.profile?.profileImagePath || '';
                }
            }

            // Fetch activities for this lead
            const { leadActivityService } = await import('./leadActivity.service.js');
            const activities = await leadActivityService.getActivitiesByLeadId(organization, lead._id.toString());

            // Count completed site visits
            const site_visits_completed = activities.filter(a => a.updates === 'site_visit' && a.site_visit_completed).length;

            return {
                _id: lead._id.toString(),
                profile_id: lead.profile_id,
                organization: lead.organization,
                profile: lead.profile ? { ...lead.profile, phone } : null,
                stage: lead.stage,
                status: lead.status === 'Untouched' ? 'No Activity' : lead.status,
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
                exe_user_name,
                exe_user_image,
                activities,
                site_visits_completed,
                createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : '',
                updatedAt: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : '',
                important_activities: (lead.important_activities || []).map(ia => ({
                    activity_id: ia.activity_id,
                    marked_at: ia.marked_at ? new Date(ia.marked_at).toISOString() : '',
                    marked_by: ia.marked_by?.toString()
                })),
            };
        } catch (err) {
            throw new AppError('Failed to fetch lead: ' + err.message, 500);
        }
    }

    async updateLead(organization, id, updateData, user = null) {
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
            return await this.getLeadById(organization, id, user);
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

    async toggleImportantActivity(organization, leadId, activityId, userId) {
        if (!organization) throw new AppError('Organization is required', 400);
        if (!leadId) throw new AppError('Lead ID is required', 400);
        if (!activityId) throw new AppError('Activity ID is required', 400);
        if (!userId) throw new AppError('User ID is required', 400);

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
                    marked_by: userId,
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

    async getBulkUploads(organization) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const BulkUpload = getBulkUploadModel(orgConn);
            const uploads = await BulkUpload.find({ organization })
                .sort({ createdAt: -1 })
                .lean();

            return uploads.map(u => ({
                _id: u._id?.toString() || '',
                uploadDate: u.createdAt ? new Date(u.createdAt).toISOString() : '',
                fileName: u.fileName || '',
                totalLeads: u.totalLeads || 0,
                uploadedLeads: u.uploadedLeads || 0,
                existingLeads: u.existingLeads || 0,
                errorLeads: u.errorLeads || 0,
                source: u.source || '',
                campaign: u.campaign || '',
                initiatedBy: u.initiatedByName || u.initiatedByEmail || u.initiatedBy || '',
                assignedTo: u.assignedTo || '-',
                status: u.status || 'Success',
                allowReEngage: u.allowReEngage !== false ? 'Yes' : 'No',
            }));
        } catch (err) {
            throw new AppError('Failed to fetch bulk uploads: ' + err.message, 500);
        }
    }
}

export const leadService = new LeadService();

