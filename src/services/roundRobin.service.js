import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { getUserAvailabilityModel } from '../models/userAvailability.model.js';
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

/**
 * Helper: get the Monday (week start) for a given date
 */
function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}

/**
 * Helper: get day name from a date
 */
function getDayName(date = new Date()) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date(date).getDay()];
}

export class RoundRobinService {
    /**
     * Get the next pre-sales user for lead assignment using round-robin.
     * Now respects user availability — if the next user is unavailable today,
     * their pre-configured fallback user gets the assignment instead.
     * The round-robin index still advances normally.
     *
     * @param {string} organization - The organization identifier
     * @returns {string|null} UUID of the next pre-sales user, or null if none found
     */
    async getNextPreSalesUser(organization) {
        if (!organization) return null;

        const orgConn = await getOrganizationConnection(organization);
        const ClientUser = getClientUserModel(orgConn);
        const RoundRobinState = getRoundRobinStateModel(orgConn);
        const Availability = getUserAvailabilityModel(orgConn);

        // 1. Get all active pre-sales users
        const allPreSalesUsers = await ClientUser.find({
            department: 'pre-sales',
            isActive: true,
        })
            .sort({ _id: 1 })
            .select('_id')
            .lean();

        if (!allPreSalesUsers || allPreSalesUsers.length === 0) {
            return null;
        }

        // 2. Fetch today's availabilities
        const today = new Date();
        const ws = getWeekStart(today);
        const dayName = getDayName(today);

        const availabilities = await Availability.find({
            organization,
            weekStart: ws
        }).lean();

        const availMap = {};
        for (const a of availabilities) {
            availMap[a.userId.toString()] = a;
        }

        /**
         * 3. Construct the rotation list based on current availability logic:
         * - If Available: KEEP in rotation.
         * - If Unavailable AND HAS Fallback: KEEP in rotation (will be swapped later).
         * - If Unavailable AND NO Fallback: REMOVE from rotation (Skip/Redistribute mode).
         */
        const rotationList = allPreSalesUsers.filter(user => {
            const uid = user._id.toString();
            const avail = availMap[uid];
            
            const isAvailable = !avail || avail.days?.[dayName] !== false;
            const hasFallback = avail?.fallbackUsers?.[dayName];

            return isAvailable || hasFallback;
        });

        // Safety fallback: if everyone is filtered out, use all users
        const finalRotationList = rotationList.length > 0 ? rotationList : allPreSalesUsers;

        // 4. Calculate next index and update state
        let state = await RoundRobinState.findOne({ organization });
        if (!state) {
            state = await RoundRobinState.create({ organization, lastIndex: -1 });
        }

        const nextIndex = (state.lastIndex + 1) % finalRotationList.length;

        await RoundRobinState.findOneAndUpdate(
            { organization },
            { lastIndex: nextIndex },
            { new: true }
        );

        const selectedUser = finalRotationList[nextIndex];
        const selectedUserId = selectedUser._id.toString();
        const selectedUserAvail = availMap[selectedUserId];

        // 5. Final assignment swap if the selected user has a fallback
        if (selectedUserAvail && selectedUserAvail.days?.[dayName] === false) {
            const fallbackId = selectedUserAvail.fallbackUsers?.[dayName];
            if (fallbackId) {
                return fallbackId.toString();
            }
        }

        return selectedUserId;
    }
}

export const roundRobinService = new RoundRobinService();
