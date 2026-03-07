import { getClientCpTeamModel } from '../models/cpTeam.model.js';
import { getCpUserModel } from '../models/cpUser.model.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { AppError } from '../utils/apiResponse.util.js';

export class CpTeamService {
    /**
     * Get the org-specific CP Team and CP User models
     */
    async _getOrgModels(organization) {
        const orgConnection = await getOrganizationConnection(organization);
        const ClientCpTeam = getClientCpTeamModel(orgConnection);
        const ClientCpUser = getCpUserModel(orgConnection);
        return { ClientCpTeam, ClientCpUser, orgConnection };
    }

    /**
     * Create a new CP team
     */
    async createCpTeam(data) {
        const { name, description, organization, createdBy, memberIds } = data;

        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        const { ClientCpTeam, ClientCpUser } = await this._getOrgModels(organization);

        // Check if team name already exists for this org
        const existing = await ClientCpTeam.findOne({ name, organization, isActive: true });
        if (existing) {
            throw new AppError('A CP team with this name already exists', 400);
        }

        // Create the team
        const cpTeam = await ClientCpTeam.create({
            name,
            description: description || '',
            organization,
            members: memberIds || [],
            createdBy,
            isActive: true,
        });

        // Update cp_users' teams array/string if needed. 
        // Note: cpUser schema uses a simple 'team' string field, not an array of objects like internal Users.
        // If we update a CP user to belong to this team, we overwrite their 'team' string with the team's name
        if (memberIds && memberIds.length > 0) {
            await ClientCpUser.updateMany(
                { _id: { $in: memberIds } },
                { $set: { team: cpTeam.name } }
            );
        }

        return cpTeam;
    }

    /**
     * Get all CP teams for an organization
     */
    async getAllCpTeams(organization) {
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        const { ClientCpTeam } = await this._getOrgModels(organization);
        const cpTeams = await ClientCpTeam.find({ organization, isActive: true })
            .sort({ createdAt: -1 })
            .lean();

        return cpTeams;
    }

    /**
     * Get a single CP team by ID with member details
     */
    async getCpTeamById(organization, teamId) {
        const { ClientCpTeam, ClientCpUser } = await this._getOrgModels(organization);

        const cpTeam = await ClientCpTeam.findOne({ _id: teamId, organization, isActive: true }).lean();
        if (!cpTeam) {
            throw new AppError('CP Team not found', 404);
        }

        // Fetch member details
        let members = [];
        if (cpTeam.members && cpTeam.members.length > 0) {
            members = await ClientCpUser.find({ _id: { $in: cpTeam.members }, isActive: true })
                .select('_id profile team company isActive')
                .lean();
        }

        return { ...cpTeam, memberDetails: members };
    }

    /**
     * Update CP team info (name, description)
     */
    async updateCpTeam(organization, teamId, data) {
        const { ClientCpTeam, ClientCpUser } = await this._getOrgModels(organization);

        const cpTeam = await ClientCpTeam.findOne({ _id: teamId, organization, isActive: true });
        if (!cpTeam) {
            throw new AppError('CP Team not found', 404);
        }

        // If renaming, check uniqueness
        if (data.name && data.name !== cpTeam.name) {
            const existing = await ClientCpTeam.findOne({ name: data.name, organization, isActive: true });
            if (existing) {
                throw new AppError('A CP team with this name already exists', 400);
            }
        }

        const oldName = cpTeam.name;
        const updatedTeam = await ClientCpTeam.findByIdAndUpdate(teamId, data, { new: true, runValidators: true }).lean();

        // If name changed, update all members' team string
        if (data.name && data.name !== oldName) {
            await ClientCpUser.updateMany(
                { team: oldName },
                { $set: { team: data.name } }
            );
        }

        return updatedTeam;
    }

    /**
     * Soft delete a CP team and remove references from CP users
     */
    async deleteCpTeam(organization, teamId) {
        const { ClientCpTeam, ClientCpUser } = await this._getOrgModels(organization);

        const cpTeam = await ClientCpTeam.findOne({ _id: teamId, organization, isActive: true });
        if (!cpTeam) {
            throw new AppError('CP Team not found', 404);
        }

        // Soft delete
        await ClientCpTeam.findByIdAndUpdate(teamId, { isActive: false });

        // Remove team reference from all members by setting their team string to empty
        await ClientCpUser.updateMany(
            { team: cpTeam.name },
            { $set: { team: '' } }
        );

        return cpTeam;
    }

    /**
     * Add members to a CP team.
     */
    async addMembersToCpTeam(organization, teamId, userIds) {
        const { ClientCpTeam, ClientCpUser } = await this._getOrgModels(organization);

        const cpTeam = await ClientCpTeam.findOne({ _id: teamId, organization, isActive: true });
        if (!cpTeam) {
            throw new AppError('CP Team not found', 404);
        }

        // Check which CP users exist
        const users = await ClientCpUser.find({ _id: { $in: userIds }, isActive: true })
            .select('_id profile team')
            .lean();

        if (users.length === 0) {
            throw new AppError('No valid CP users found', 400);
        }

        const warnings = [];
        const addedUserIds = [];

        for (const user of users) {
            // Check if user already in this team
            const alreadyInTeam = (cpTeam.members || []).some(
                mId => String(mId) === String(user._id)
            );
            if (alreadyInTeam) continue;

            const otherTeam = user.team && user.team !== cpTeam.name ? user.team : null;
            if (otherTeam) {
                warnings.push({
                    userId: user._id,
                    userName: `${user.profile.firstName} ${user.profile.lastName}`,
                    existingTeam: otherTeam,
                });
            }

            addedUserIds.push(user._id);
        }

        // Add users to team members
        if (addedUserIds.length > 0) {
            // First, remove these users from any other CP team they might be lingering in
            await ClientCpTeam.updateMany(
                { _id: { $ne: teamId }, organization },
                { $pullAll: { members: addedUserIds } }
            );

            await ClientCpTeam.findByIdAndUpdate(teamId, {
                $addToSet: { members: { $each: addedUserIds } }
            });

            // Update users' team string
            await ClientCpUser.updateMany(
                { _id: { $in: addedUserIds } },
                { $set: { team: cpTeam.name } }
            );
        }

        return { addedCount: addedUserIds.length, warnings };
    }

    /**
     * Remove a member from a CP team
     */
    async removeMemberFromCpTeam(organization, teamId, userId) {
        const { ClientCpTeam, ClientCpUser } = await this._getOrgModels(organization);

        const cpTeam = await ClientCpTeam.findOne({ _id: teamId, organization, isActive: true });
        if (!cpTeam) {
            throw new AppError('CP Team not found', 404);
        }

        // Remove user from team members
        await ClientCpTeam.findByIdAndUpdate(teamId, {
            $pull: { members: userId }
        });

        // Clear team string from CP user
        await ClientCpUser.findByIdAndUpdate(userId, {
            $set: { team: '' }
        });

        return { success: true };
    }

    /**
     * Get all CP users with their team info (which is just the string on the profile)
     */
    async getAllCpUsersWithTeams(organization) {
        const { ClientCpUser } = await this._getOrgModels(organization);

        const users = await ClientCpUser.find({ isActive: true })
            .select('_id profile team company isActive')
            .sort({ createdAt: -1 })
            .lean();

        return users;
    }
}

export const cpTeamService = new CpTeamService();
