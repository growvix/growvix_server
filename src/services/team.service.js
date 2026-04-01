import { Team, getClientTeamModel } from '../models/team.model.js';
import { User } from '../models/user.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { AppError } from '../utils/apiResponse.util.js';

export class TeamService {
    /**
     * Get the org-specific Team and User models
     */
    async _getOrgModels(organization) {
        const orgConnection = await getOrganizationConnection(organization);
        const ClientTeam = getClientTeamModel(orgConnection);
        const ClientUser = getClientUserModel(orgConnection);
        return { ClientTeam, ClientUser, orgConnection };
    }

    /**
     * Create a new team
     */
    async createTeam(data) {
        const { name, description, organization, createdBy, memberIds } = data;

        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        const { ClientTeam, ClientUser } = await this._getOrgModels(organization);

        // Check if team name already exists for this org
        const existing = await ClientTeam.findOne({ name, organization, isActive: true });
        if (existing) {
            throw new AppError('A team with this name already exists', 400);
        }

        // Create the team
        const team = await ClientTeam.create({
            name,
            description: description || '',
            organization,
            members: memberIds || [],
            createdBy,
            isActive: true,
        });

        // Update users' teams array if members provided (in both DBs)
        if (memberIds && memberIds.length > 0) {
            const teamUpdate = { $addToSet: { teams: { teamId: team._id, teamName: team.name } } };
            // Org db
            await ClientUser.updateMany({ _id: { $in: memberIds } }, teamUpdate);
            // Global db
            await User.updateMany({ _id: { $in: memberIds } }, teamUpdate);
        }

        return team;
    }

    /**
     * Get all teams for an organization
     */
    async getAllTeams(organization) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        const { ClientTeam } = await this._getOrgModels(organization);
        const teams = await ClientTeam.find({ organization, isActive: true })
            .sort({ createdAt: -1 })
            .lean();

        return teams;
    }

    /**
     * Get a single team by ID with member details
     */
    async getTeamById(organization, teamId) {
        const { ClientTeam, ClientUser } = await this._getOrgModels(organization);

        const team = await ClientTeam.findOne({ _id: teamId, organization, isActive: true }).lean();
        if (!team) {
            throw new AppError('Team not found', 404);
        }

        // Fetch member details
        let members = [];
        if (team.members && team.members.length > 0) {
            members = await ClientUser.find({ _id: { $in: team.members }, isActive: true })
                .select('_id profile_id profile role teams')
                .lean();
        }

        return { ...team, memberDetails: members };
    }

    /**
     * Update team info (name, description)
     */
    async updateTeam(organization, teamId, data) {
        const { ClientTeam, ClientUser } = await this._getOrgModels(organization);

        const team = await ClientTeam.findOne({ _id: teamId, organization, isActive: true });
        if (!team) {
            throw new AppError('Team not found', 404);
        }

        // If renaming, check uniqueness
        if (data.name && data.name !== team.name) {
            const existing = await ClientTeam.findOne({ name: data.name, organization, isActive: true });
            if (existing) {
                throw new AppError('A team with this name already exists', 400);
            }
        }

        const oldName = team.name;
        const updatedTeam = await ClientTeam.findByIdAndUpdate(teamId, data, { new: true, runValidators: true }).lean();

        // If name changed, update all members' teams array
        if (data.name && data.name !== oldName) {
            await ClientUser.updateMany(
                { 'teams.teamId': teamId },
                { $set: { 'teams.$.teamName': data.name } }
            );
        }

        return updatedTeam;
    }

    /**
     * Soft delete a team and remove references from users
     */
    async deleteTeam(organization, teamId) {
        const { ClientTeam, ClientUser } = await this._getOrgModels(organization);

        const team = await ClientTeam.findOne({ _id: teamId, organization, isActive: true });
        if (!team) {
            throw new AppError('Team not found', 404);
        }

        // Soft delete
        await ClientTeam.findByIdAndUpdate(teamId, { isActive: false });

        // Remove team reference from all members (both DBs)
        const teamPullUpdate = { $pull: { teams: { teamId: teamId } } };
        // Org db
        await ClientUser.updateMany({ 'teams.teamId': teamId }, teamPullUpdate);
        // Global db
        await User.updateMany({ 'teams.teamId': teamId }, teamPullUpdate);

        return team;
    }

    /**
     * Add members to a team.
     * Returns warnings for users who already belong to other teams.
     */
    async addMembersToTeam(organization, teamId, userIds) {
        const { ClientTeam, ClientUser } = await this._getOrgModels(organization);

        const team = await ClientTeam.findOne({ _id: teamId, organization, isActive: true });
        if (!team) {
            throw new AppError('Team not found', 404);
        }

        // Check which users already have teams
        const users = await ClientUser.find({ _id: { $in: userIds }, isActive: true })
            .select('_id profile teams')
            .lean();

        if (users.length === 0) {
            throw new AppError('No valid users found', 400);
        }

        const warnings = [];
        const addedUserIds = [];

        for (const user of users) {
            // Check if user already in this team
            const alreadyInTeam = (user.teams || []).some(
                t => String(t.teamId) === String(teamId)
            );
            if (alreadyInTeam) continue;

            // Check if user belongs to other teams
            const otherTeams = (user.teams || []).filter(
                t => String(t.teamId) !== String(teamId)
            );
            if (otherTeams.length > 0) {
                warnings.push({
                    userId: user._id,
                    userName: `${user.profile.firstName} ${user.profile.lastName}`,
                    existingTeams: otherTeams.map(t => t.teamName),
                });
            }

            addedUserIds.push(user._id);
        }

        // Add users to team members
        if (addedUserIds.length > 0) {
            await ClientTeam.findByIdAndUpdate(teamId, {
                $addToSet: { members: { $each: addedUserIds } }
            });

            // Update users' teams array (in both DBs)
            const teamUpdate = { $addToSet: { teams: { teamId: team._id, teamName: team.name } } };
            // Org db
            await ClientUser.updateMany({ _id: { $in: addedUserIds } }, teamUpdate);
            // Global db
            await User.updateMany({ _id: { $in: addedUserIds } }, teamUpdate);
        }

        return { addedCount: addedUserIds.length, warnings };
    }

    /**
     * Remove a member from a team
     */
    async removeMemberFromTeam(organization, teamId, userId) {
        const { ClientTeam, ClientUser } = await this._getOrgModels(organization);

        const team = await ClientTeam.findOne({ _id: teamId, organization, isActive: true });
        if (!team) {
            throw new AppError('Team not found', 404);
        }

        // Remove user from team members
        await ClientTeam.findByIdAndUpdate(teamId, {
            $pull: { members: userId }
        });

        // Remove team from user's teams array (both DBs)
        const teamRemoveUpdate = { $pull: { teams: { teamId: teamId } } };
        // Org db
        await ClientUser.findByIdAndUpdate(userId, teamRemoveUpdate);
        // Global db
        await User.findByIdAndUpdate(userId, teamRemoveUpdate);

        return { success: true };
    }

    /**
     * Get all users with their team info for an organization
     */
    async getAllUsersWithTeams(organization) {
        const { ClientUser } = await this._getOrgModels(organization);

        const users = await ClientUser.find({ isActive: true })
            .select('_id profile_id profile role teams isActive')
            .sort({ createdAt: -1 })
            .lean();

        return users;
    }
}

export const teamService = new TeamService();
