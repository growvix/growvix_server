import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Shared User Schema - Used for both global and organization databases
 * Single source of truth for user structure
 */
const UserSchemaDefinition = {
    _id: {
        type: mongoose.Schema.Types.UUID,
        default: uuidv4
    },
    profile_id: {
        type: Number,
        unique: true,
        index: true
    },
    globalUserId: {
        type: mongoose.Schema.Types.UUID,
        index: true
    },
    organization: { type: String, index: true },
    profile: {
        firstName: { type: String, required: true },
        lastName: { type: String },
        email: { type: String, required: true, unique: true, index: true },
        phone: { type: String },
        profileImagePath: { type: String },
    },
    password: { type: String, select: false },
    role: { type: String, enum: ['user', 'admin', 'manager'], default: 'user' },
    department: { type: String, enum: ['pre-sales', 'sales', 'post-sales'], default: 'pre-sales' },
    isActive: { type: Boolean, default: true },
    teams: [{   
        teamId: { type: mongoose.Schema.Types.UUID },
        teamName: { type: String }
    }],
    permissions: [{ type: String }],
};

// Schema options
const schemaOptions = {
    timestamps: true,
    _id: false
};

/**
 * Get the ClientUser model for a specific organization connection
 * Uses the same schema as the global User model
 * @param {mongoose.Connection} connection - The organization database connection
 * @returns {mongoose.Model} - The User model for this connection
 */
export const getClientUserModel = (connection) => {
    // Return cached model if exists (performance optimization)
    if (connection.models.User) {
        return connection.models.User;
    }

    // Create schema with 'users' collection for org db
    const schema = new Schema(UserSchemaDefinition, {
        ...schemaOptions,
        collection: 'users'
    });

    return connection.model('User', schema);
};
