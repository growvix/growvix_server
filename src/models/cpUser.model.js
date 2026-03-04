import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Shared CP User schema definition
 * Used for both:
 *  - Global DB collection: global_cp_users (source of truth)
 *  - Org DB collection:    cp_users         (tenant copy)
 */
const cpUserSchemaDefinition = {
    _id: {
        type: mongoose.Schema.Types.UUID,
        default: uuidv4,
    },
    globalCpUserId: {
        type: mongoose.Schema.Types.UUID,
        index: true,
    },
    organization: { type: String, required: true, index: true },
    profile: {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
        phone: { type: String, trim: true },
        address: { type: String, trim: true },
    },
    password: { type: String, required: true, select: false },
    company: { type: String, trim: true, default: '' },
    team: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
};

const schemaOptions = {
    timestamps: true,
    _id: false,   // we supply our own UUID _id
};

// ─── Global Model ────────────────────────────────────────────────────────────
// Stored in the admin/global database under "global_cp_users"
const GlobalCpUserSchema = new Schema(cpUserSchemaDefinition, {
    ...schemaOptions,
    collection: 'global_cp_users',
});

export const GlobalCpUser = mongoose.model('GlobalCpUser', GlobalCpUserSchema);

// ─── Org (Tenant) Model Factory ──────────────────────────────────────────────
// Stored in each org database under "cp_users"
/**
 * Get the CpUser model for a specific organization connection.
 * @param {mongoose.Connection} connection - The organization database connection
 * @returns {mongoose.Model}
 */
export const getCpUserModel = (connection) => {
    if (connection.models.CpUser) {
        return connection.models.CpUser;
    }

    const schema = new Schema(cpUserSchemaDefinition, {
        ...schemaOptions,
        collection: 'cp_users',
    });

    return connection.model('CpUser', schema);
};