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

    getProjectById = asyncHandler(async (req, res) => {
        const organization = req.query.organization;
        const { id } = req.params;
        const project = await projectService.getProjectById(organization, id);
        res.status(200).json(ApiResponse.success('Project fetched successfully', project));
    });

    getProjectBlocks = asyncHandler(async (req, res) => {
        const organization = req.query.organization;
        const { id } = req.params;
        const blocks = await projectService.getProjectBlocks(organization, id);
        res.status(200).json(ApiResponse.success('Project blocks fetched successfully', blocks));
    });

    updateProject = asyncHandler(async (req, res) => {
        const organization = req.query.organization || req.body.organization;
        const { id } = req.params;
        const project = await projectService.updateProject(organization, id, req.body);
        res.status(200).json(ApiResponse.success('Project updated successfully', project));
    });

    bookUnit = asyncHandler(async (req, res) => {
        const organization = req.body.organization;
        const { id } = req.params;
        const { blockId, unitId, plotId, leadName, leadUuid, phone } = req.body;
        const result = await projectService.bookUnit(organization, id, {
            blockId, unitId, plotId, leadName, leadUuid, phone
        });
        res.status(200).json(ApiResponse.success('Unit booked successfully', result));
    });
}

export const projectController = new ProjectController();
