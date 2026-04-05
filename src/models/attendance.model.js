import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attendance Session Schema
 * Each document represents a single login/logout session for a user on a given day.
 * Multiple sessions per day are supported (e.g., breaks).
 */
const AttendanceSessionSchema = new Schema(
    {
        _id: {
            type: mongoose.Schema.Types.UUID,
            default: uuidv4
        },
        userId: {
            type: mongoose.Schema.Types.UUID,
            required: true,
            index: true
        },
        organization: {
            type: String,
            required: true,
            index: true
        },
        date: {
            type: String, // YYYY-MM-DD format for easy grouping
            required: true,
            index: true
        },
        loginTime: {
            type: Date,
            required: true
        },
        logoutTime: {
            type: Date,
            default: null
        },
        duration: {
            type: Number, // Duration in minutes
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true // true = currently logged in
        }
    },
    {
        timestamps: true,
        collection: 'attendance_sessions',
        _id: false
    }
);

// Compound index for fast queries
AttendanceSessionSchema.index({ userId: 1, date: 1 });
AttendanceSessionSchema.index({ organization: 1, date: 1 });

export const AttendanceSession = mongoose.model('AttendanceSession', AttendanceSessionSchema);

/**
 * Get the AttendanceSession model for an organization-specific connection
 */
export const getAttendanceSessionModel = (connection) => {
    if (connection.models.AttendanceSession) {
        return connection.models.AttendanceSession;
    }

    const schema = new Schema(
        {
            _id: {
                type: mongoose.Schema.Types.UUID,
                default: uuidv4
            },
            userId: {
                type: mongoose.Schema.Types.UUID,
                required: true,
                index: true
            },
            organization: {
                type: String,
                required: true,
                index: true
            },
            date: {
                type: String,
                required: true,
                index: true
            },
            loginTime: {
                type: Date,
                required: true
            },
            logoutTime: {
                type: Date,
                default: null
            },
            duration: {
                type: Number,
                default: 0
            },
            isActive: {
                type: Boolean,
                default: true
            }
        },
        {
            timestamps: true,
            collection: 'attendance_sessions',
            _id: false
        }
    );

    schema.index({ userId: 1, date: 1 });
    schema.index({ organization: 1, date: 1 });

    return connection.model('AttendanceSession', schema);
};
