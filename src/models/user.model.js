import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global User Schema - Used for users in the global admin database
 * This is the source of truth for user structure
 */
const UserSchema = new Schema(
    {
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
        organization: { type: String, required: true, index: true },
        profile: {
            firstName: { type: String, required: true },
            lastName: { type: String },
            email: { type: String, required: true, unique: true, index: true },
            phone: { type: String },
            profileImagePath: { type: String },
        },
        password: { type: String, required: true, select: false },
        role: { type: String, enum: ['user', 'admin', 'manager'], default: 'user' },
        department: { type: String, enum: ['pre-sales', 'sales', 'post-sales'] },
        isActive: { type: Boolean, default: true },
        teams: [{
            teamId: { type: mongoose.Schema.Types.UUID },
            teamName: { type: String }
        }],
        permissions: [{ type: String }],
    },
    {
        timestamps: true,
        collection: 'global_users',
        _id: false
    }
);

export const User = mongoose.model('User', UserSchema);
