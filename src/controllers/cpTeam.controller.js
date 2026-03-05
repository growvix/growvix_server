import { cpTeamService } from '../services/cpTeam.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class CpTeamController {
    // Get all CP teams for the user's organization
    getAllCpTeams = asyncHandler(async (req, res) => {
        const org = req.query.organization || req.user?.organization;
        const cpTeams = await cpTeamService.getAllCpTeams(org);
        res.status(200).json(ApiResponse.success('CP Teams retrieved', cpTeams));
    });

    // Get a single CP team by ID with member details
    getCpTeamById = asyncHandler(async (req, res) => {
        const org = req.query.organization || req.user?.organization;
        const cpTeam = await cpTeamService.getCpTeamById(org, req.params.id);
        res.status(200).json(ApiResponse.success('CP Team retrieved', cpTeam));
    });

    // Create a new CP team
    createCpTeam = asyncHandler(async (req, res) => {
        const teamData = {
            ...req.body,
            organization: req.user?.organization,
            createdBy: req.user?._id,
        };
        const cpTeam = await cpTeamService.createCpTeam(teamData);
        res.status(201).json(ApiResponse.success('CP Team created successfully', cpTeam));
    });

    // Update a CP team
    updateCpTeam = asyncHandler(async (req, res) => {
        const org = req.user?.organization;
        const cpTeam = await cpTeamService.updateCpTeam(org, req.params.id, req.body);
        res.status(200).json(ApiResponse.success('CP Team updated', cpTeam));
    });

    // Delete a CP team (soft delete)
    deleteCpTeam = asyncHandler(async (req, res) => {
        const org = req.user?.organization;
        await cpTeamService.deleteCpTeam(org, req.params.id);
        res.status(200).json(ApiResponse.success('CP Team deleted'));
    });

    // Add members to a CP team
    addMembers = asyncHandler(async (req, res) => {
        const org = req.user?.organization;
        const { userIds } = req.body;
        const result = await cpTeamService.addMembersToCpTeam(org, req.params.id, userIds);
        res.status(200).json(ApiResponse.success('Members added', result));
    });

    // Remove a member from a CP team
    removeMember = asyncHandler(async (req, res) => {
        const org = req.user?.organization;
        const result = await cpTeamService.removeMemberFromCpTeam(org, req.params.id, req.params.userId);
        res.status(200).json(ApiResponse.success('Member removed', result));
    });

    // Get all CP users with their team assignments
    getAllCpUsersWithTeams = asyncHandler(async (req, res) => {
        const org = req.query.organization || req.user?.organization;
        const users = await cpTeamService.getAllCpUsersWithTeams(org);
        res.status(200).json(ApiResponse.success('CP Users with teams retrieved', users));
    });
}

export const cpTeamController = new CpTeamController();
