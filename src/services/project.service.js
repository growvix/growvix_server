import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getProjectModel } from '../models/project.model.js';
import { getLeadModel } from '../models/lead.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class ProjectService {
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

    async addProject(data) {
        const organization = data.organization;
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        // Validate required project fields
        if (!data.name || !data.name.trim()) {
            throw new AppError('Project name is required', 400);
        }
        if (!data.location || !data.location.trim()) {
            throw new AppError('Project location is required', 400);
        }

        // Validation based on property type
        if (data.property === 'plots') {
            // Validate plots
            if (!data.plots || data.plots.length === 0) {
                throw new AppError('At least one plot is required', 400);
            }
            for (let i = 0; i < data.plots.length; i++) {
                const plot = data.plots[i];
                if (!plot.plotNumber || !plot.plotNumber.toString().trim()) {
                    throw new AppError(`Plot ${i + 1}: Plot number is required`, 400);
                }
                if (!plot.size || plot.size < 1) {
                    throw new AppError(`Plot "${plot.plotNumber}": Size is required and must be greater than 0`, 400);
                }
            }
        } else {
            // Validate blocks for apartments/villas/commercial
            if (!data.blocks || data.blocks.length === 0) {
                throw new AppError('At least one block is required', 400);
            }

            // Validate each block
            for (let i = 0; i < data.blocks.length; i++) {
                const block = data.blocks[i];
                if (!block.blockName || !block.blockName.trim()) {
                    throw new AppError(`Block ${i + 1}: Block name is required`, 400);
                }
                if (!block.floors || block.floors.length === 0) {
                    throw new AppError(`Block "${block.blockName}": At least one floor is required`, 400);
                }

                // Validate each floor
                for (let j = 0; j < block.floors.length; j++) {
                    const floor = block.floors[j];
                    if (!floor.units || floor.units.length === 0) {
                        throw new AppError(`Block "${block.blockName}", Floor ${floor.floorNumber || j + 1}: At least one unit is required`, 400);
                    }

                    // Validate each unit
                    for (let k = 0; k < floor.units.length; k++) {
                        const unit = floor.units[k];
                        if (!unit.unitNumber || !unit.unitNumber.trim()) {
                            throw new AppError(`Block "${block.blockName}", Floor ${floor.floorNumber || j + 1}, Unit ${k + 1}: Unit number (door number) is required`, 400);
                        }
                        if (!unit.bhk || unit.bhk < 1) {
                            throw new AppError(`Block "${block.blockName}", Floor ${floor.floorNumber || j + 1}, Unit "${unit.unitNumber}": BHK is required and must be at least 1`, 400);
                        }
                        if (!unit.size || unit.size < 1) {
                            throw new AppError(`Block "${block.blockName}", Floor ${floor.floorNumber || j + 1}, Unit "${unit.unitNumber}": Size is required and must be greater than 0`, 400);
                        }
                    }
                }
            }
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);

            // Check for duplicate project name (case-insensitive, space-normalized) ignoring inactive projects
            const normalizedName = data.name.trim().replace(/\s+/g, ' ').toLowerCase();
            const existingProjects = await Project.find({ status: { $ne: 'inactive' } }).select('name');
            const duplicate = existingProjects.find(p => {
                const existingNormalized = p.name.trim().replace(/\s+/g, ' ').toLowerCase();
                return existingNormalized === normalizedName;
            });
            if (duplicate) {
                throw new AppError(`Project name "${data.name}" already exists (names are case-insensitive)`, 400);
            }

            // Auto-generate sequential product_id
            const lastProject = await Project.findOne().sort({ product_id: -1 }).select('product_id');
            const nextProductId = lastProject ? lastProject.product_id + 1 : 1;
            data.product_id = nextProductId;

            const project = await Project.create(data);
            return project;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to add project: ' + err.message, 500);
        }
    }

    async getAllProjects(organization) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);
            
            console.log(`[ProjectService] getAllProjects called for organization: "${organization}" (dbName: ${orgConn.name})`);

            // Use aggregation for faster performance with large datasets
            const projects = await Project.aggregate([
                {
                    $match: { status: { $ne: 'inactive' } }
                },
                {
                    $project: {
                        product_id: 1,
                        name: 1,
                        location: 1,
                        property: 1,
                        img_location: 1,
                        createdAt: 1,
                        blockCount: { $size: { $ifNull: ['$blocks', []] } },
                        plotCount: { $size: { $ifNull: ['$plots', []] } },
                        bookedCount: {
                            $let: {
                                vars: {
                                    bookedPlots: {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ['$plots', []] },
                                                as: 'plot',
                                                cond: { $eq: ['$$plot.status', 'booked'] }
                                            }
                                        }
                                    },
                                    bookedUnits: {
                                        $reduce: {
                                            input: { $ifNull: ['$blocks', []] },
                                            initialValue: 0,
                                            in: {
                                                $add: [
                                                    '$$value',
                                                    {
                                                        $reduce: {
                                                            input: { $ifNull: ['$$this.floors', []] },
                                                            initialValue: 0,
                                                            in: {
                                                                $add: [
                                                                    '$$value',
                                                                    {
                                                                        $size: {
                                                                            $filter: {
                                                                                input: { $ifNull: ['$$this.units', []] },
                                                                                as: 'unit',
                                                                                cond: { $eq: ['$$unit.status', 'booked'] }
                                                                            }
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                },
                                in: { $add: ['$$bookedPlots', '$$bookedUnits'] }
                            }
                        },
                        totalUnits: {
                            $cond: {
                                if: { $eq: ['$property', 'plots'] },
                                then: { $size: { $ifNull: ['$plots', []] } },
                                else: {
                                    $reduce: {
                                        input: { $ifNull: ['$blocks', []] },
                                        initialValue: 0,
                                        in: {
                                            $add: [
                                                '$$value',
                                                {
                                                    $reduce: {
                                                        input: { $ifNull: ['$$this.floors', []] },
                                                        initialValue: 0,
                                                        in: { $add: ['$$value', { $size: { $ifNull: ['$$this.units', []] } }] }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                { $sort: { createdAt: -1 } }
            ]);
            
            console.log(`[ProjectService] Found ${projects.length} projects for organization "${organization}".`);

            return projects;
        } catch (err) {
            console.error(`[ProjectService] Error in getAllProjects:`, err);
            throw new AppError('Failed to fetch projects: ' + err.message, 500);
        }
    }

    async getProjectById(organization, productId) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!productId) {
            throw new AppError('Project ID is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);
            const project = await Project.findOne({ product_id: parseInt(productId) });

            if (!project) {
                throw new AppError('Project not found', 404);
            }

            return project;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch project: ' + err.message, 500);
        }
    }

    async getProjectBlocks(organization, productId) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!productId) {
            throw new AppError('Project ID is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);
            const project = await Project.findOne({ product_id: parseInt(productId) })
                .select('product_id name blocks');

            if (!project) {
                throw new AppError('Project not found', 404);
            }

            return {
                product_id: project.product_id,
                name: project.name,
                blocks: project.blocks || []
            };
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch project blocks: ' + err.message, 500);
        }
    }

    async bookUnit(organization, productId, { blockId, unitId, plotId, leadName, leadUuid, profileId, phone, userId, userName }) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!productId) {
            throw new AppError('Project ID is required', 400);
        }
        if (!leadName || !leadUuid || !phone) {
            throw new AppError('Lead name, UUID, and phone are required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);
            const project = await Project.findOne({ product_id: parseInt(productId) });

            if (!project) {
                throw new AppError('Project not found', 404);
            }

            // Plot booking
            if (plotId) {
                const plot = project.plots?.find(p => p.plotId === plotId);
                if (!plot) {
                    throw new AppError('Plot not found', 404);
                }
                if (plot.status !== 'available') {
                    throw new AppError(`Plot ${plot.plotNumber} is not available (current status: ${plot.status})`, 400);
                }
                plot.status = 'booked';
                plot.bookedBy = { leadName, leadUuid, profileId, phone, userId, userName, bookedAt: new Date() };
                await project.save();
                return { type: 'plot', item: plot };
            }

            // Unit booking
            if (blockId && unitId) {
                const block = project.blocks?.find(b => b.blockId === blockId);
                if (!block) {
                    throw new AppError('Block not found', 404);
                }

                let targetUnit = null;
                for (const floor of block.floors) {
                    const unit = floor.units?.find(u => u.unitId === unitId);
                    if (unit) {
                        targetUnit = unit;
                        break;
                    }
                }

                if (!targetUnit) {
                    throw new AppError('Unit not found', 404);
                }
                if (targetUnit.status !== 'available') {
                    throw new AppError(`Unit ${targetUnit.unitNumber} is not available (current status: ${targetUnit.status})`, 400);
                }

                targetUnit.status = 'booked';
                targetUnit.bookedBy = { leadName, leadUuid, profileId, phone, userId, userName, bookedAt: new Date() };
                await project.save();
                return { type: 'unit', item: targetUnit };
            }

            throw new AppError('Either plotId or blockId+unitId must be provided', 400);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to book unit: ' + err.message, 500);
        }
    }

    async reverseBooking(organization, productId, { blockId, unitId, plotId }) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!productId) {
            throw new AppError('Project ID is required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);
            const project = await Project.findOne({ product_id: parseInt(productId) });

            if (!project) {
                throw new AppError('Project not found', 404);
            }

            // Plot unbooking
            if (plotId) {
                const plot = project.plots?.find(p => p.plotId === plotId);
                if (!plot) {
                    throw new AppError('Plot not found', 404);
                }
                plot.status = 'available';
                plot.bookedBy = undefined;
                project.markModified('plots');
                await project.save();
                return { type: 'plot', item: plot };
            }

            // Unit unbooking
            if (blockId && unitId) {
                const block = project.blocks?.find(b => b.blockId === blockId);
                if (!block) {
                    throw new AppError('Block not found', 404);
                }

                let targetUnit = null;
                for (const floor of block.floors) {
                    const unit = floor.units?.find(u => u.unitId === unitId);
                    if (unit) {
                        targetUnit = unit;
                        break;
                    }
                }

                if (!targetUnit) {
                    throw new AppError('Unit not found', 404);
                }

                targetUnit.status = 'available';
                targetUnit.bookedBy = undefined;
                project.markModified('blocks');
                await project.save();
                return { type: 'unit', item: targetUnit };
            }

            throw new AppError('Either plotId or blockId+unitId must be provided', 400);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to reverse booking: ' + err.message, 500);
        }
    }

    async updateProject(organization, productId, updateData) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!productId) {
            throw new AppError('Project ID is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);

            if (updateData.name) {
                const normalizedName = updateData.name.trim().replace(/\s+/g, ' ').toLowerCase();
                const existingProjects = await Project.find({ 
                    status: { $ne: 'inactive' },
                    product_id: { $ne: parseInt(productId) }
                }).select('name');
                
                const duplicate = existingProjects.find(p => {
                    const existingNormalized = p.name.trim().replace(/\s+/g, ' ').toLowerCase();
                    return existingNormalized === normalizedName;
                });
                
                if (duplicate) {
                    throw new AppError(`Project name "${updateData.name}" already exists (names are case-insensitive)`, 400);
                }
            }

            const project = await Project.findOneAndUpdate(
                { product_id: parseInt(productId) },
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!project) {
                throw new AppError('Project not found', 404);
            }

            return project;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to update project: ' + err.message, 500);
        }
    }

    async getProjectBookedUnits(organization, productId, requester = { permissions: [], role: '' }) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        if (!productId) {
            throw new AppError('Project ID is required', 400);
        }

        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);

            const project = await Project.findOne({ product_id: parseInt(productId) });
            if (!project) {
                throw new AppError('Project not found', 404);
            }

            const bookedItems = [];

            // Collect booked plots
            if (project.plots && project.plots.length > 0) {
                for (const plot of project.plots) {
                    if (plot.status === 'booked') {
                        bookedItems.push({
                            id: plot.plotId,
                            label: `Plot ${plot.plotNumber}`,
                            type: 'plot',
                            bookedBy: plot.bookedBy,
                            project_name: project.name,
                            project_id: project.product_id
                        });
                    }
                }
            }

            // Collect booked units
            if (project.blocks && project.blocks.length > 0) {
                for (const block of project.blocks) {
                    for (const floor of block.floors || []) {
                        for (const unit of floor.units || []) {
                            if (unit.status === 'booked') {
                                bookedItems.push({
                                    id: unit.unitId,
                                    label: `${block.blockName} - ${unit.unitNumber}`,
                                    type: 'unit',
                                    bookedBy: unit.bookedBy,
                                    project_name: project.name,
                                    project_id: project.product_id
                                });
                            }
                        }
                    }
                }
            }

            // Fetch missing or masked phone numbers from Leads
            const leadModel = getLeadModel(orgConn);
            const permissions = requester?.permissions || [];
            const isForcedMasking = permissions.includes('mask_phone_number');
            const canShowLeadPhone = (permissions.includes('view_lead_phone') || requester?.role === 'admin') && !isForcedMasking;

            for (let i = 0; i < bookedItems.length; i++) {
                const item = bookedItems[i];
                if (item.bookedBy && item.bookedBy.leadUuid) {
                    const needsHealing = !item.bookedBy.phone || item.bookedBy.phone.startsWith('*');
                    const needsProfileId = !item.bookedBy.profileId;

                    if (needsHealing || needsProfileId) {
                        try {
                            const lead = await leadModel.findOne({ _id: item.bookedBy.leadUuid }).select('profile_id profile.phone').lean();
                            if (lead) {
                                if (needsProfileId) item.bookedBy.profileId = lead.profile_id;
                                if (needsHealing && lead.profile?.phone) {
                                    item.bookedBy.phone = lead.profile.phone;
                                }
                            }
                        } catch (error) {
                            console.error(`Error healing lead data for UUID ${item.bookedBy.leadUuid}:`, error.message);
                        }
                    }

                    // Apply masking based on permission (bypass for admins)
                    if (!canShowLeadPhone && item.bookedBy.phone && item.bookedBy.phone !== "-") {
                        item.bookedBy.phone = this._maskPhoneNumber(item.bookedBy.phone);
                    }
                }
            }

            // Sort by booking date descending if available
            bookedItems.sort((a, b) => {
                const dateA = a.bookedBy?.bookedAt ? new Date(a.bookedBy.bookedAt).getTime() : 0;
                const dateB = b.bookedBy?.bookedAt ? new Date(b.bookedBy.bookedAt).getTime() : 0;
                return dateB - dateA; // Newest first
            });

            return bookedItems;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch booked units: ' + err.message, 500);
        }
    }

    async getAllBookedUnits(organization, filters = {}, requester = null) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
 
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);
 
            // Role-based filtering
            const role = requester?.role?.toLowerCase();
            const isAdmin = role === 'admin' || role === 'manager';
            let effectiveUserFilter = null;
 
            if (!isAdmin && requester) {
                effectiveUserFilter = await this._getEffectiveUserIds(orgConn, requester);
            } else if (filters.userId) {
                effectiveUserFilter = { ids: [String(filters.userId)] };
            }

            const bookedItems = [];

            const query = {};
            if (filters.projectId) {
                query.product_id = parseInt(filters.projectId);
            }

            const projects = await Project.find(query);

            for (const project of projects) {
                // Collect booked plots
                if (project.plots && project.plots.length > 0) {
                    for (const plot of project.plots) {
                        if (plot.status === 'booked') {
                            const dateMatch = !filters.startDate || !filters.endDate ||
                                (plot.bookedBy?.bookedAt &&
                                    new Date(plot.bookedBy.bookedAt) >= new Date(filters.startDate) &&
                                    new Date(plot.bookedBy.bookedAt) <= new Date(filters.endDate + 'T23:59:59.999Z'));

                            const userMatch = !effectiveUserFilter || 
                                (plot.bookedBy?.userId && effectiveUserFilter.ids.includes(String(plot.bookedBy.userId)));

                            if (dateMatch && userMatch) {
                                bookedItems.push({
                                    id: plot.plotId,
                                    label: `Plot ${plot.plotNumber}`,
                                    type: 'plot',
                                    bookedBy: plot.bookedBy,
                                    project_name: project.name,
                                    project_id: project.product_id
                                });
                            }
                        }
                    }
                }

                // Collect booked units
                if (project.blocks && project.blocks.length > 0) {
                    for (const block of project.blocks) {
                        for (const floor of block.floors || []) {
                            for (const unit of floor.units || []) {
                                if (unit.status === 'booked') {
                                    const dateMatch = !filters.startDate || !filters.endDate ||
                                        (unit.bookedBy?.bookedAt &&
                                            new Date(unit.bookedBy.bookedAt) >= new Date(filters.startDate) &&
                                            new Date(unit.bookedBy.bookedAt) <= new Date(filters.endDate + 'T23:59:59.999Z'));

                                    const userMatch = !effectiveUserFilter || 
                                        (unit.bookedBy?.userId && effectiveUserFilter.ids.includes(String(unit.bookedBy.userId)));

                                    if (dateMatch && userMatch) {
                                        bookedItems.push({
                                            id: unit.unitId,
                                            label: `${block.blockName} - ${unit.unitNumber}`,
                                            type: 'unit',
                                            bookedBy: unit.bookedBy,
                                            project_name: project.name,
                                            project_id: project.product_id
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Fetch missing or masked phone numbers from Leads
            const leadModel = getLeadModel(orgConn);
            const permissions = requester?.permissions || [];
            const isForcedMasking = permissions.includes('mask_phone_number');
            const canShowLeadPhone = (permissions.includes('view_lead_phone') || requester?.role === 'admin') && !isForcedMasking;

            for (let i = 0; i < bookedItems.length; i++) {
                const item = bookedItems[i];
                if (item.bookedBy && item.bookedBy.leadUuid) {
                    const needsHealing = !item.bookedBy.phone || item.bookedBy.phone.startsWith('*');
                    const needsProfileId = !item.bookedBy.profileId;

                    if (needsHealing || needsProfileId) {
                        try {
                            const lead = await leadModel.findOne({ _id: item.bookedBy.leadUuid }).select('profile_id profile.phone').lean();
                            if (lead) {
                                if (needsProfileId) item.bookedBy.profileId = lead.profile_id;
                                if (needsHealing && lead.profile?.phone) {
                                    item.bookedBy.phone = lead.profile.phone;
                                }
                            }
                        } catch (error) {
                            console.error(`Error healing lead data for UUID ${item.bookedBy.leadUuid}:`, error.message);
                        }
                    }

                    // Apply masking based on permission (bypass for admins)
                    if (!canShowLeadPhone && item.bookedBy.phone && item.bookedBy.phone !== "-") {
                        item.bookedBy.phone = this._maskPhoneNumber(item.bookedBy.phone);
                    }
                }
            }

            return bookedItems;
        } catch (err) {
            console.error(err);
            throw new AppError('Failed to fetch all booked units: ' + err.message, 500);
        }
    }

    _maskPhoneNumber(phone) {
        if (!phone || phone === "-" || phone.length <= 2) return phone;
        return `********${phone.slice(-2)}`;
    }
}

export const projectService = new ProjectService();
