import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { GlobalCpUser } from '../models/cpUser.model.js';
import { GlobalCpTeam } from '../models/cpTeam.model.js';
import { AppError } from '../utils/apiResponse.util.js';
import { hashPassword, comparePassword, signToken } from '../utils/security.util.js';
const { getOrganizationConnection } = await import('../config/multiTenantDb.js');
const { getClientUserModel } = await import('../models/clientUser.model.js');

export class AuthService {

    async register(data) {
        // Check if user exists by email (which is in profile.email)
        const email = data.profile?.email;
        const organization = data.organization;
        if (!email) {
            throw new AppError('Email is required', 400);
        }
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        // Check in global_users
        const existingUser = await User.findOne({ 'profile.email': email });
        if (existingUser) {
            throw new AppError('Email already in use', 400);
        }

        if (data.password) {
            data.password = await hashPassword(data.password);
        }

        // Auto-generate sequential profile_id
        const lastUser = await User.findOne().sort({ profile_id: -1 }).select('profile_id');
        const nextProfileId = lastUser?.profile_id ? lastUser.profile_id + 1 : 1;
        data.profile_id = nextProfileId;

        // Add to global_users (admin db)
        const user = await User.create(data);
        const token = signToken(user._id, user.role);

        // Add to organization users (client db)
        try {
            const orgConn = await getOrganizationConnection(organization);
            const ClientUser = getClientUserModel(orgConn);
            // Prepare client user data
            const clientUserData = {
                _id: user._id,
                profile_id: user.profile_id,
                globalUserId: user._id,
                organization: user.organization,
                profile: user.profile,
                role: user.role,
                department: user.department,
                permissions: user.permissions || [],
                isActive: true
            };
            await ClientUser.create(clientUserData);
        } catch (err) {
            // Optionally: rollback global user creation or log error
            console.error('Failed to add user to organization DB:', err);
        }

        const userObj = user.toObject();
        delete userObj.password;

        return { user: userObj, token };
    }

    async login(data) {
        const { email, password } = data;

        if (!email || !password) {
            throw new AppError('Please provide email and password', 400);
        }

        // Find by profile.email
        const user = await User.findOne({ 'profile.email': email }).select('+password');
        if (!user || !user.password) {
            throw new AppError('Invalid credentials', user, 401);
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            throw new AppError('Invalid credentials', user, 401);
        }

        const token = signToken(user._id, user.role);

        const userObj = user.toObject();
        delete userObj.password;

        let permissions = user.permissions || [];
        // Auto-grant administrative permissions to admins
        console.log(user);

        if (user.role === 'admin') {
            const adminPerms = ['manage_users', 'manage_teams', 'show_user_phone_number', 'view_lead_phone'];
            permissions = [...new Set([...permissions, ...adminPerms])];
        }

        // Return user data with profile_id instead of uuid
        return {
            user: userObj,
            token,
            user_id: user._id.toString(),
            profile_id: user.profile_id,
            organization: user.organization,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            email: user.profile.email,
            profileImagePath: user.profile.profileImagePath || '',
            role: user.role,
            permissions: permissions
        };
    }
    async cplogin(data) {
        const { email, password } = data;

        if (!email || !password) {
            throw new AppError('Please provide email and password', 400);
        }

        // Find by profile.email
        const user = await GlobalCpUser.findOne({ 'profile.email': email }).select('+password');
        if (!user || !user.password) {
            throw new AppError('Invalid credentials', 401);
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            throw new AppError('Invalid credentials', 401);
        }

        const role = user.role || 'cp_user'; // Provide a default role for CP users
        const token = signToken(user._id, role);

        const userObj = user.toObject();
        delete userObj.password;

        const permissions = user.permissions || [];
        let allowed_projects = user.allowed_projects || [];

        // Combine user's specific projects with their team's projects
        if (user.team && user.organization) {
            try {
                const team = await GlobalCpTeam.findOne({
                    name: user.team,
                    organization: user.organization,
                    isActive: true
                }).lean();

                if (team && team.allowed_projects && team.allowed_projects.length > 0) {
                    // Create a Map with project_id as key to avoid duplicates
                    const projectMap = new Map();

                    // Add user's existing projects
                    allowed_projects.forEach(p => projectMap.set(p.project_id, p));

                    // Merge team projects
                    team.allowed_projects.forEach(p => {
                        if (!projectMap.has(p.project_id)) {
                            projectMap.set(p.project_id, p);
                        }
                    });

                    allowed_projects = Array.from(projectMap.values());
                }
            } catch (err) {
                console.error(`Error fetching team projects for user ${user._id}:`, err.message);
            }
        }

        // Return user data with profile_id fallback
        return {
            user: userObj,
            token,
            user_id: user._id.toString(),
            profile_id: user.profile_id || user._id.toString(),
            organization: user.organization,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            email: user.profile.email,
            profileImagePath: user.profile.profileImagePath || '',
            role: role,
            permissions: permissions,
            allowed_projects: allowed_projects,
        };
    }

    async impersonate(callerUserId, targetUserId) {
        // Verify the caller exists and get their role
        const callerUser = await User.findById(callerUserId);
        if (!callerUser) {
            throw new AppError('Caller not found', 404);
        }

        const callerRole = callerUser.role?.toLowerCase();
        if (callerRole !== 'admin' && callerRole !== 'manager') {
            throw new AppError('Only admins and managers can impersonate other users', 403);
        }

        // Find the target user
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            throw new AppError('Target user not found', 404);
        }

        // 🛡️ SECURITY CHECKS for Managers
        if (callerRole === 'manager') {
            // Check if target is in the same organization
            if (String(targetUser.organization) !== String(callerUser.organization)) {
                throw new AppError('You can only impersonate users within your own organization', 403);
            }
            // Check if target is a regular "user"
            if (targetUser.role?.toLowerCase() !== 'user') {
                throw new AppError('Managers are only permitted to impersonate accounts with the "user" role', 403);
            }
        }

        const token = signToken(targetUser._id, targetUser.role);
        let permissions = targetUser.permissions || [];
        // Auto-grant administrative permissions to admins
        if (targetUser.role === 'admin') {
            const adminPerms = ['manage_users', 'manage_teams', 'show_user_phone_number', 'view_lead_phone'];
            permissions = [...new Set([...permissions, ...adminPerms])];
        }

        return {
            user_id: targetUser._id.toString(),
            profile_id: targetUser.profile_id,
            organization: targetUser.organization,
            firstName: targetUser.profile.firstName,
            lastName: targetUser.profile.lastName,
            email: targetUser.profile.email,
            profileImagePath: targetUser.profile.profileImagePath || '',
            token,
            role: targetUser.role,
            permissions: permissions
        };
    }
}

export const authService = new AuthService();
