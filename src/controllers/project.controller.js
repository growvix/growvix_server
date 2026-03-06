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
        const { blockId, unitId, plotId, leadName, leadUuid, profileId, phone, userId, userName } = req.body;

        // Use auth user details if not provided in body (fallback)
        const finalUserId = userId || (req.user ? req.user.id : undefined);
        const finalUserName = userName || (req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : undefined);

        const result = await projectService.bookUnit(organization, id, {
            blockId, unitId, plotId, leadName, leadUuid, profileId, phone,
            userId: finalUserId,
            userName: finalUserName
        });
        res.status(200).json(ApiResponse.success('Unit booked successfully', result));
    });

    getProjectBookedUnits = asyncHandler(async (req, res) => {
        const organization = req.query.organization;
        const { id } = req.params;
        const bookedUnits = await projectService.getProjectBookedUnits(organization, id);
        res.status(200).json(ApiResponse.success('Project booked units fetched successfully', bookedUnits));
    });

    getAllBookedUnits = asyncHandler(async (req, res) => {
        const organization = req.query.organization;

        // Extract filters from query parameters
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            userId: req.query.userId,
            teamId: req.query.teamId,
            projectId: req.query.projectId
        };

        const bookedUnits = await projectService.getAllBookedUnits(organization, filters);
        res.status(200).json(ApiResponse.success('All booked units fetched successfully', bookedUnits));
    });
}

export const projectController = new ProjectController();
