import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Client User Schema - Used for users in organization-specific databases
 * This is a simplified version stored in each client's database
 */
const ClientUserSchema = new Schema(
    {
        _id: {
            type: mongoose.Schema.Types.UUID,
            default: uuidv4
        },
        globalUserId: {
            type: mongoose.Schema.Types.UUID,
            required: true,
            index: true
        },
        profile: {
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            email: { type: String, required: true, unique: true, index: true },
            phone: { type: String },
            profileImagePath: { type: String },
        },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: 'users',
        _id: false
    }
);

/**
 * Get the ClientUser model for a specific organization connection
 * @param {mongoose.Connection} connection - The organization database connection
 * @returns {mongoose.Model} - The ClientUser model for this connection
 */
export const getClientUserModel = (connection) => {
    // Check if model already exists on this connection
    if (connection.models.ClientUser) {
        return connection.models.ClientUser;
    }
    return connection.model('ClientUser', ClientUserSchema);
};
