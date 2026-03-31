import { User } from '../models/user.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { AppError } from '../utils/apiResponse.util.js';
import { hashPassword } from '../utils/security.util.js';

export class UserService {
    async getUserById(id, requesterPermissions = []) {
        const user = await User.findById(id).lean();
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const canShowPhone = requesterPermissions.includes('show_user_phone_number');
        if (!canShowPhone && user.profile?.phone && user.profile.phone !== "-") {
            user.profile.phone = this._maskPhoneNumber(user.profile.phone);
        }

        return user;
    }

    _maskPhoneNumber(phone) {
        if (!phone || phone === "-" || phone.length <= 2) return phone;
        return `********${phone.slice(-2)}`;
    }

    /**
     * Create a new user
     * - Stores in global admin database (global_users collection)
     * - Also stores a copy in the organization-specific database (users collection)
     */
    async createUser(data) {
        const { firstName, lastName, email, phone, password, role, organization } = data;

        // Validate required fields
        if (!organization) {
            throw new AppError('Organization is required', 400);
        }

        // Check if user already exists in global database
        const existingUser = await User.findOne({ 'profile.email': email });
        if (existingUser) {
            throw new AppError('Email already in use', 400);
        }

        const hashedPassword = await hashPassword(password);

        // Step 1: Create user in global admin database
        const newUser = await User.create({
            organization,
            profile: {
                firstName,
                lastName,
                email,
                phone
            },
            password: hashedPassword,
            role
        });

        // Step 2: Store a copy in organization-specific database
        try {
            const orgConnection = await getOrganizationConnection(organization);
            console.log("Org DB connected:", orgConnection.name);

            const ClientUser = getClientUserModel(orgConnection);
            console.log("ClientUser model ready");

            const createdClientUser = await ClientUser.create({
                _id: newUser._id,
                globalUserId: newUser._id,
                profile: {
                    firstName,
                    lastName,
                    email,
                    phone
                },
                role,
                isActive: true
            });

            console.log("Client user created:", createdClientUser._id);
        } catch (orgError) {
            console.error("Org DB insert failed:", orgError);
        }


        const userObj = newUser.toObject();
        delete userObj.password;

        return userObj;
    }

    /**
     * Get all users from global database
     * Optionally filter by organization
     */
    async getAllUsers({ limit = 10, page = 1, organization = null } = {}) {
        const safeLimit = Math.max(1, parseInt(limit, 10));
        const safePage = Math.max(1, parseInt(page, 10));
        const skip = (safePage - 1) * safeLimit;

        const query = organization ? { organization } : {};

        const [users, total] = await Promise.all([
            User.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .lean(), // returns plain JS objects (faster)
            User.countDocuments(query)
        ]);

        const canShowPhone = (arguments[0].requesterPermissions || []).includes('show_user_phone_number');
        if (!canShowPhone) {
            users.forEach(u => {
                if (u.profile?.phone && u.profile.phone !== "-") {
                    u.profile.phone = this._maskPhoneNumber(u.profile.phone);
                }
            });
        }

        return {
            users,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit)
        };
    }


    /**
     * Get users from a specific organization's database
     */
    async getOrganizationUsers(organization, limit = 10, page = 1, requesterPermissions = []) {
        const skip = (page - 1) * limit;

        const orgConnection = await getOrganizationConnection(organization);
        const ClientUser = getClientUserModel(orgConnection);

        const users = await ClientUser.find({ isActive: true }).skip(skip).limit(limit).lean();
        const total = await ClientUser.countDocuments({ isActive: true });

        const canShowPhone = requesterPermissions.includes('show_user_phone_number');
        if (!canShowPhone) {
            users.forEach(u => {
                if (u.profile?.phone && u.profile.phone !== "-") {
                    u.profile.phone = this._maskPhoneNumber(u.profile.phone);
                }
            });
        }

        return { users, total, page, limit };
    }

    async updateUser(id, data) {
        // If updating profile, check email uniqueness
        if (data.profile?.email) {
            const existing = await User.findOne({ 'profile.email': data.profile.email, _id: { $ne: id } });
            if (existing) {
                throw new AppError('Email already in use', 400);
            }
        }

        // Update in global database
        const user = await User.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Also update in organization database if organization exists
        if (user.organization) {
            try {
                const orgConnection = await getOrganizationConnection(user.organization);
                const ClientUser = getClientUserModel(orgConnection);

                // Build update object for client user
                const clientUpdate = {};
                if (data.profile) clientUpdate.profile = data.profile;
                if (data.role) clientUpdate.role = data.role;
                if (data.department) clientUpdate.department = data.department;
                if (data.permissions) clientUpdate.permissions = data.permissions;

                await ClientUser.findOneAndUpdate(
                    { globalUserId: id },
                    clientUpdate,
                    { new: true }
                );
            } catch (orgError) {
                console.error(`Failed to update user in organization database: ${orgError.message}`);
            }
        }

        return user;
    }

    async deleteUser(id) {
        const user = await User.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Delete from global database
        await User.findByIdAndDelete(id);

        // Also delete/deactivate from organization database
        if (user.organization) {
            try {
                const orgConnection = await getOrganizationConnection(user.organization);
                const ClientUser = getClientUserModel(orgConnection);

                // Soft delete - mark as inactive instead of removing
                await ClientUser.findOneAndUpdate(
                    { globalUserId: id },
                    { isActive: false }
                );

                // Or hard delete:
                // await ClientUser.findOneAndDelete({ globalUserId: id });
            } catch (orgError) {
                console.error(`Failed to delete user from organization database: ${orgError.message}`);
            }
        }

        return user;
    }
}

export const userService = new UserService();
