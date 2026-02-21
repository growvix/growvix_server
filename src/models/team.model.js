import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Team Schema - Used for teams in the organization database
 */
const TeamSchema = new Schema(
    {
        _id: {
            type: mongoose.Schema.Types.UUID,
            default: uuidv4
        },
        name: { type: String, required: true },
        description: { type: String, default: '' },
        organization: { type: String, required: true, index: true },
        members: [{
            type: mongoose.Schema.Types.UUID,
            ref: 'User'
        }],
        createdBy: {
            type: mongoose.Schema.Types.UUID,
            ref: 'User'
        },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: 'teams',
        _id: false
    }
);

// Compound unique index: team name must be unique per organization
TeamSchema.index({ name: 1, organization: 1 }, { unique: true });

export const Team = mongoose.model('Team', TeamSchema);

/**
 * Get the Team model for a specific organization connection (multi-tenant)
 */
export const getClientTeamModel = (connection) => {
    if (connection.models.Team) {
        return connection.models.Team;
    }

    const schema = new Schema(
        {
            _id: {
                type: mongoose.Schema.Types.UUID,
                default: uuidv4
            },
            name: { type: String, required: true },
            description: { type: String, default: '' },
            organization: { type: String, required: true, index: true },
            members: [{
                type: mongoose.Schema.Types.UUID,
                ref: 'User'
            }],
            createdBy: {
                type: mongoose.Schema.Types.UUID,
                ref: 'User'
            },
            isActive: { type: Boolean, default: true },
        },
        {
            timestamps: true,
            collection: 'teams',
            _id: false
        }
    );

    schema.index({ name: 1, organization: 1 }, { unique: true });

    return connection.model('Team', schema);
};
