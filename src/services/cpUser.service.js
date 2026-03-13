import { GlobalCpUser } from '../models/cpUser.model.js';
import { getCpUserModel } from '../models/cpUser.model.js';
import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { AppError } from '../utils/apiResponse.util.js';
import { hashPassword } from '../utils/security.util.js';

import mongoose from 'mongoose';

export class CpUserService {

    /**
     * Helper: get the CpUser model for a given org DB connection
     */
    async _getOrgModel(organization) {
        if (!organization) throw new AppError('Organization is required', 400);
        const connection = await getOrganizationConnection(organization);
        return getCpUserModel(connection);
    }

    /**
     * Create a new Channel Partner
     * - Hashes password with bcrypt
     * - Writes to global_cp_users (source of truth)
     * - Copies to org DB cp_users (tenant copy)
     */
    async createCpUser(data) {
        const { firstName, lastName, email, phone, address, password, company, team, organization } = data;

        if (!organization) throw new AppError('Organization is required', 400);

        // Check email uniqueness in global DB
        const existing = await GlobalCpUser.findOne({ 'profile.email': email });
        if (existing) {
            throw new AppError('A channel partner with this email already exists', 400);
        }

        const hashedPassword = await hashPassword(password);

        // Step 1: Create in global DB
        const newCpUser = await GlobalCpUser.create({
            organization,
            profile: { firstName, lastName, email, phone, address },
            password: hashedPassword,
            company: company || '',
            team: team || '',
        });

        // Step 2: Copy to org-specific DB
        try {
            const OrgCpUser = await this._getOrgModel(organization);
            await OrgCpUser.create({
                _id: newCpUser._id,
                globalCpUserId: newCpUser._id,
                organization,
                profile: { firstName, lastName, email, phone, address },
                password: hashedPassword,
                company: company || '',
                team: team || '',
                isActive: true,
            });
        } catch (orgError) {
            console.error('Org DB cp_user insert failed:', orgError.message);
        }

        const cpUserObj = newCpUser.toObject();
        delete cpUserObj.password;
        return cpUserObj;
    }

    /**
     * Get all active Channel Partners for an organization (from org DB)
     */
    async getAllCpUsers(organization, limit = 50, page = 1) {
        const OrgCpUser = await this._getOrgModel(organization);
        const skip = (page - 1) * limit;

        const [cpUsers, total] = await Promise.all([
            OrgCpUser.find({ isActive: true })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            OrgCpUser.countDocuments({ isActive: true }),
        ]);

        return { cpUsers, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    /**
     * Get a single Channel Partner by ID
     */
    async getCpUserById(id, organization) {
        const OrgCpUser = await this._getOrgModel(organization);
        const cpUser = await OrgCpUser.findOne({ _id: id, isActive: true });
        if (!cpUser) throw new AppError('Channel Partner not found', 404);
        return cpUser;
    }

    /**
     * Update a Channel Partner (global DB + org DB)
     */
    async updateCpUser(id, organization, data) {
        // Check email uniqueness if being changed
        if (data.profile?.email) {
            const existing = await GlobalCpUser.findOne({
                'profile.email': data.profile.email,
                _id: { $ne: id },
            });
            if (existing) throw new AppError('Email already in use by another channel partner', 400);
        }

        // Update global DB
        const updated = await GlobalCpUser.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );
        if (!updated) throw new AppError('Channel Partner not found', 404);

        // Sync to org DB
        try {
            const OrgCpUser = await this._getOrgModel(organization);
            await OrgCpUser.findOneAndUpdate(
                { globalCpUserId: id },
                { $set: data },
                { new: true }
            );
        } catch (orgError) {
            console.error('Org DB cp_user update failed:', orgError.message);
        }

        const cpUserObj = updated.toObject();
        delete cpUserObj.password;
        return cpUserObj;
    }

    /**
     * Hard-delete a Channel Partner from both global DB and org DB.
     * Uses native collection driver to bypass Mongoose UUID casting —
     * this handles both old ObjectId records and new UUID records safely.
     */
    async deleteCpUser(id, organization) {
        // Build a query that covers standard combinations (Plain String, Mongoose ObjectId, Mongoose UUID)
        const idConditions = [{ _id: id }];
        
        try {
            if (mongoose.isValidObjectId(id)) {
                idConditions.push({ _id: new mongoose.Types.ObjectId(id) });
            }
        } catch(e) {}
        
        try {
            if (mongoose.mongo && mongoose.mongo.BSON && mongoose.mongo.BSON.UUID) {
                idConditions.push({ _id: new mongoose.mongo.BSON.UUID(id) });
            } else if (mongoose.mongo && mongoose.mongo.UUID) {
                idConditions.push({ _id: new mongoose.mongo.UUID(id) });
            }
        } catch(e) {}

        const filter = { $or: idConditions };

        // Delete from global DB using native driver (bypasses UUID cast)
        const globalResult = await GlobalCpUser.collection.deleteOne(filter);

        // Also try deleting from org DB using native driver
        try {
            const OrgCpUser = await this._getOrgModel(organization);
            await OrgCpUser.collection.deleteOne(filter);
        } catch (orgError) {
            console.error('Org DB cp_user delete failed:', orgError.message);
        }

        // If nothing was deleted from global DB, the record was org-only (old data)
        // That's still a valid delete — don't throw
        if (globalResult.deletedCount === 0) {
            console.warn(`CP User ${id} not found in global DB — may be a legacy record`);
        }

        return { _id: id };
    }
}

export const cpUserService = new CpUserService();
