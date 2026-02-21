import { teamService } from '../services/team.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class TeamController {
    // Get all teams for the user's organization
    getAllTeams = asyncHandler(async (req, res) => {
        const org = req.query.organization || req.user?.organization;
        const teams = await teamService.getAllTeams(org);
        res.status(200).json(ApiResponse.success('Teams retrieved', teams));
    });

    // Get a single team by ID with member details
    getTeamById = asyncHandler(async (req, res) => {
        const org = req.query.organization || req.user?.organization;
        const team = await teamService.getTeamById(org, req.params.id);
        res.status(200).json(ApiResponse.success('Team retrieved', team));
    });

    // Create a new team
    createTeam = asyncHandler(async (req, res) => {
        const teamData = {
            ...req.body,
            organization: req.user?.organization,
            createdBy: req.user?._id,
        };
        const team = await teamService.createTeam(teamData);
        res.status(201).json(ApiResponse.success('Team created successfully', team));
    });

    // Update a team
    updateTeam = asyncHandler(async (req, res) => {
        const org = req.user?.organization;
        const team = await teamService.updateTeam(org, req.params.id, req.body);
        res.status(200).json(ApiResponse.success('Team updated', team));
    });

    // Delete a team (soft delete)
    deleteTeam = asyncHandler(async (req, res) => {
        const org = req.user?.organization;
        await teamService.deleteTeam(org, req.params.id);
        res.status(200).json(ApiResponse.success('Team deleted'));
    });

    // Add members to a team
    addMembers = asyncHandler(async (req, res) => {
        const org = req.user?.organization;
        const { userIds } = req.body;
        const result = await teamService.addMembersToTeam(org, req.params.id, userIds);
        res.status(200).json(ApiResponse.success('Members added', result));
    });

    // Remove a member from a team
    removeMember = asyncHandler(async (req, res) => {
        const org = req.user?.organization;
        const result = await teamService.removeMemberFromTeam(org, req.params.id, req.params.userId);
        res.status(200).json(ApiResponse.success('Member removed', result));
    });

    // Get all users with their team assignments
    getAllUsersWithTeams = asyncHandler(async (req, res) => {
        const org = req.query.organization || req.user?.organization;
        const users = await teamService.getAllUsersWithTeams(org);
        res.status(200).json(ApiResponse.success('Users with teams retrieved', users));
    });
}

export const teamController = new TeamController();
