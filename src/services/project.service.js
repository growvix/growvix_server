import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getProjectModel } from '../models/project.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class ProjectService {
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

            // Check for duplicate project name (case-insensitive, space-normalized)
            const normalizedName = data.name.trim().replace(/\s+/g, ' ').toLowerCase();
            const existingProjects = await Project.find().select('name');
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

            // Use aggregation for faster performance with large datasets
            const projects = await Project.aggregate([
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

            return projects;
        } catch (err) {
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

    async bookUnit(organization, productId, { blockId, unitId, plotId, leadName, leadUuid, phone }) {
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
                plot.bookedBy = { leadName, leadUuid, phone };
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
                targetUnit.bookedBy = { leadName, leadUuid, phone };
                await project.save();
                return { type: 'unit', item: targetUnit };
            }

            throw new AppError('Either plotId or blockId+unitId must be provided', 400);
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to book unit: ' + err.message, 500);
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
}

export const projectService = new ProjectService();
