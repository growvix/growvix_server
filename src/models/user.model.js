import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
    {
        _id: {
            type: mongoose.Schema.Types.UUID,
            default: uuidv4
        },
        organization: { type: String, required: true },
        profile: {
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            email: { type: String, required: true, unique: true, index: true },
            phone: { type: String },
            profileImagePath: { type: String },
        },
        password: { type: String, required: true, select: false }, // Store hashed password
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
    },
    {
        timestamps: true,
        collection: 'global_users',
        _id: false
    }
);

export const User = mongoose.model('User', UserSchema);
