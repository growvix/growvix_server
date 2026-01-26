import { projectService } from '../services/project.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class ProjectController {
    addProject = asyncHandler(async (req, res) => {
        const project = await projectService.addProject(req.body);
        res.status(201).json(ApiResponse.success('Project added successfully', project));
    });

    getAllProjects = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.body.organization;
        const projects = await projectService.getAllProjects(organization);
        res.status(200).json(ApiResponse.success('Projects fetched successfully', projects));
    });
}

export const projectController = new ProjectController();
