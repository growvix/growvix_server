import mongoose, { Schema } from 'mongoose';

/**
 * User Availability Schema
 * Stores weekly availability for each user.
 * Each document represents one user's availability for a specific week.
 * weekStart is the Monday date string (YYYY-MM-DD) of that week.
 */
const UserAvailabilitySchema = new Schema(
    {

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
        weekStart: {
            type: String, // YYYY-MM-DD (Monday of the week)
            required: true,
            index: true
        },
        // Availability for each day of the week (true = available, false = on leave)
        days: {
            monday:    { type: Boolean, default: true },
            tuesday:   { type: Boolean, default: true },
            wednesday: { type: Boolean, default: true },
            thursday:  { type: Boolean, default: true },
            friday:    { type: Boolean, default: true },
            saturday:  { type: Boolean, default: true },
            sunday:    { type: Boolean, default: true },
        },
        // Fallback user mapping: if this user is unavailable on a day,
        // who takes their round-robin slot?
        // Key = day name, Value = userId of the fallback user
        fallbackUsers: {
            monday:    { type: mongoose.Schema.Types.UUID, default: null },
            tuesday:   { type: mongoose.Schema.Types.UUID, default: null },
            wednesday: { type: mongoose.Schema.Types.UUID, default: null },
            thursday:  { type: mongoose.Schema.Types.UUID, default: null },
            friday:    { type: mongoose.Schema.Types.UUID, default: null },
            saturday:  { type: mongoose.Schema.Types.UUID, default: null },
            sunday:    { type: mongoose.Schema.Types.UUID, default: null },
        }
    },
    {
        timestamps: true,
        collection: 'user_availability'
    }
);

// Compound unique index: one record per user per week
UserAvailabilitySchema.index({ userId: 1, weekStart: 1, organization: 1 }, { unique: true });

export const UserAvailability = mongoose.model('UserAvailability', UserAvailabilitySchema);

/**
 * Get the UserAvailability model for an organization-specific connection
 */
export const getUserAvailabilityModel = (connection) => {
    if (connection.models.UserAvailability) {
        return connection.models.UserAvailability;
    }

    const schema = new Schema(
        {

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
            weekStart: {
                type: String,
                required: true,
                index: true
            },
            days: {
                monday:    { type: Boolean, default: true },
                tuesday:   { type: Boolean, default: true },
                wednesday: { type: Boolean, default: true },
                thursday:  { type: Boolean, default: true },
                friday:    { type: Boolean, default: true },
                saturday:  { type: Boolean, default: true },
                sunday:    { type: Boolean, default: true },
            },
            fallbackUsers: {
                monday:    { type: mongoose.Schema.Types.UUID, default: null },
                tuesday:   { type: mongoose.Schema.Types.UUID, default: null },
                wednesday: { type: mongoose.Schema.Types.UUID, default: null },
                thursday:  { type: mongoose.Schema.Types.UUID, default: null },
                friday:    { type: mongoose.Schema.Types.UUID, default: null },
                saturday:  { type: mongoose.Schema.Types.UUID, default: null },
                sunday:    { type: mongoose.Schema.Types.UUID, default: null },
            }
        },
        {
            timestamps: true,
            collection: 'user_availability'
        }
    );

    schema.index({ userId: 1, weekStart: 1, organization: 1 }, { unique: true });

    return connection.model('UserAvailability', schema);
};
