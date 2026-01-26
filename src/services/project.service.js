import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getProjectModel } from '../models/project.model.js';
import { AppError } from '../utils/apiResponse.util.js';

export class ProjectService {
    async addProject(data) {
        const organization = data.organization;
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }
        try {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);

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
            const projects = await Project.find()
                .select('product_id name type location property createdAt')
                .sort({ createdAt: -1 });
            return projects;
        } catch (err) {
            throw new AppError('Failed to fetch projects: ' + err.message, 500);
        }
    }
}

export const projectService = new ProjectService();
