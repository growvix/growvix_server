import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Shared CP Team schema definition
 * Used for both:
 *  - Global DB collection: global_cp_teams (source of truth)
 *  - Org DB collection:    cp_teams         (tenant copy)
 */
const cpTeamSchemaDefinition = {
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
    allowed_projects: [{
        project_id: { type: Number, required: true },
        project_name: { type: String, required: true },
    }],
};

const schemaOptions = {
    timestamps: true,
    _id: false,   // we supply our own UUID _id
};

// ─── Global Model ────────────────────────────────────────────────────────────
// Stored in the admin/global database under "global_cp_teams"
const GlobalCpTeamSchema = new Schema(cpTeamSchemaDefinition, {
    ...schemaOptions,
    collection: 'global_cp_teams',
});

// Compound unique index: team name must be unique per organization
GlobalCpTeamSchema.index({ name: 1, organization: 1 }, { unique: true });

export const GlobalCpTeam = mongoose.model('GlobalCpTeam', GlobalCpTeamSchema);

// ─── Org (Tenant) Model Factory ──────────────────────────────────────────────
// Stored in each org database under "cp_teams"
/**
 * Get the CP Team model for a specific organization connection (multi-tenant)
 */
const CpTeamSchema = new Schema(cpTeamSchemaDefinition, {
    ...schemaOptions,
    collection: 'cp_teams',
});
CpTeamSchema.index({ name: 1, organization: 1 }, { unique: true });

export const CpTeam = mongoose.model('CpTeam', CpTeamSchema);

/**
 * Get the CP Team model for a specific organization connection (multi-tenant)
 */
export const getClientCpTeamModel = (connection) => {
    if (connection.models.CpTeam) {
        return connection.models.CpTeam;
    }

    const schema = new Schema(cpTeamSchemaDefinition, {
        ...schemaOptions,
        collection: 'cp_teams',
    });

    schema.index({ name: 1, organization: 1 }, { unique: true });

    return connection.model('CpTeam', schema);
};
