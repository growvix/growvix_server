import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
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
                profile: user.profile,
                role: user.role,
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
            throw new AppError('Invalid credentials', 401);
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            throw new AppError('Invalid credentials', 401);
        }

        const token = signToken(user._id, user.role);

        const userObj = user.toObject();
        delete userObj.password;

        // Return user data with profile_id instead of uuid
        return {
            user: userObj,
            token,
            profile_id: user.profile_id,
            organization: user.organization,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            email: user.profile.email,
            role: user.role,
            permissions: user.permissions || []
        };
    }
}

export const authService = new AuthService();
