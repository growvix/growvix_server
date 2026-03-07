import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * CP Team Schema - Used for CP teams in the organization database
 */
const CpTeamSchema = new Schema(
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
            ref: 'CpUser'
        }],
        createdBy: {
            type: mongoose.Schema.Types.UUID,
            ref: 'User'
        },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: 'cp_teams', // Distinct collection map
        _id: false
    }
);

// Compound unique index: team name must be unique per organization
CpTeamSchema.index({ name: 1, organization: 1 }, { unique: true });

export const CpTeam = mongoose.model('CpTeam', CpTeamSchema);

/**
 * Get the CP Team model for a specific organization connection (multi-tenant)
 */
export const getClientCpTeamModel = (connection) => {
    if (connection.models.CpTeam) {
        return connection.models.CpTeam;
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
                ref: 'CpUser'
            }],
            createdBy: {
                type: mongoose.Schema.Types.UUID,
                ref: 'User'
            },
            isActive: { type: Boolean, default: true },
        },
        {
            timestamps: true,
            collection: 'cp_teams',
            _id: false
        }
    );

    schema.index({ name: 1, organization: 1 }, { unique: true });

    return connection.model('CpTeam', schema);
};
