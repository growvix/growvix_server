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
                globalUserId: user._id,
                profile: user.profile,
                role: user.role,
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

        // Return user data including organization for frontend
        return {
            user: userObj,
            token,
            uuid: user._id,
            organization: user.organization,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            email: user.profile.email
        };
    }
}

export const authService = new AuthService();
