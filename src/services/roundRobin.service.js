import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import mongoose, { Schema } from 'mongoose';

/**
 * Round Robin State Schema
 * Persists the last-assigned index per organization so it survives server restarts.
 */
const RoundRobinStateSchema = new Schema(
    {
        organization: { type: String, required: true, unique: true },
        lastIndex: { type: Number, default: -1 },
    },
    { collection: 'round_robin_state', timestamps: true }
);

/**
 * Get the RoundRobinState model for a specific organization connection.
 */
const getRoundRobinStateModel = (connection) => {
    if (connection.models.RoundRobinState) {
        return connection.models.RoundRobinState;
    }
    return connection.model('RoundRobinState', RoundRobinStateSchema);
};

export class RoundRobinService {
    /**
     * Get the next pre-sales user for lead assignment using round-robin.
     * @param {string} organization - The organization identifier
     * @returns {string|null} UUID of the next pre-sales user, or null if none found
     */
    async getNextPreSalesUser(organization) {
        if (!organization) return null;

        const orgConn = await getOrganizationConnection(organization);
        const ClientUser = getClientUserModel(orgConn);
        const RoundRobinState = getRoundRobinStateModel(orgConn);

        // Fetch active pre-sales users, sorted by _id for consistent ordering
        const preSalesUsers = await ClientUser.find({
            department: 'pre-sales',
            isActive: true,
        })
            .sort({ _id: 1 })
            .select('_id profile')
            .lean();

        if (!preSalesUsers || preSalesUsers.length === 0) {
            return null;
        }

        // Get or create round-robin state for this organization
        let state = await RoundRobinState.findOne({ organization });
        if (!state) {
            state = await RoundRobinState.create({ organization, lastIndex: -1 });
        }

        // Calculate next index (wraps around)
        const nextIndex = (state.lastIndex + 1) % preSalesUsers.length;

        // Update the state atomically
        await RoundRobinState.findOneAndUpdate(
            { organization },
            { lastIndex: nextIndex },
            { new: true }
        );

        const assignedUser = preSalesUsers[nextIndex];
        return assignedUser._id.toString();
    }
}

export const roundRobinService = new RoundRobinService();
