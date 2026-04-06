import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getUserAvailabilityModel } from '../models/userAvailability.model.js';
import { getClientUserModel } from '../models/clientUser.model.js';
import { AppError } from '../utils/apiResponse.util.js';

/**
 * Helper: get the Monday (week start) for a given date
 */
function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Helper: get day name from a date
 */
function getDayName(date = new Date()) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date(date).getDay()];
}

export class UserAvailabilityService {
    /**
     * Get weekly availability for all users in the organization
     * @param {string} organization
     * @param {string} weekStart - Optional YYYY-MM-DD of Monday. Defaults to current week.
     */
    async getWeeklyAvailability(organization, weekStart = null) {
        const orgConn = await getOrganizationConnection(organization);
        const Availability = getUserAvailabilityModel(orgConn);
        const ClientUser = getClientUserModel(orgConn);

        const ws = weekStart || getWeekStart();

        // Get all active pre-sales users
        const users = await ClientUser.find({
            isActive: true
        })
            .select('_id profile_id profile.firstName profile.lastName profile.email profile.profileImagePath role department')
            .sort({ _id: 1 })
            .lean();

        // Get availability records for this week
        const availabilities = await Availability.find({
            organization,
            weekStart: ws
        }).lean();

        // Map availability to users
        const availMap = {};
        for (const a of availabilities) {
            availMap[a.userId.toString()] = a;
        }

        const result = users.map(user => {
            const uid = user._id.toString();
            const avail = availMap[uid];

            return {
                ...user,
                _id: uid,
                availability: avail ? {
                    _id: avail._id?.toString(),
                    days: avail.days || { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
                    fallbackUsers: avail.fallbackUsers || {}
                } : {
                    _id: null,
                    days: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
                    fallbackUsers: {}
                }
            };
        });

        return { weekStart: ws, users: result };
    }

    /**
     * Toggle a user's availability for a specific day of a specific week.
     * If marking unavailable, a fallbackUserId must be provided.
     */
    async toggleAvailability(organization, userId, weekStart, day, available, fallbackUserId = null) {
        const orgConn = await getOrganizationConnection(organization);
        const Availability = getUserAvailabilityModel(orgConn);

        const ws = weekStart || getWeekStart();
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLower = day.toLowerCase();

        if (!validDays.includes(dayLower)) {
            throw new AppError('Invalid day name', 400);
        }

        // Upsert the availability record
        let record = await Availability.findOne({
            userId,
            organization,
            weekStart: ws
        });

        if (!record) {
            // Create new record with all days available
            record = await Availability.create({
                userId,
                organization,
                weekStart: ws,
                days: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
                fallbackUsers: {}
            });
        }

        // Update the specific day
        record.days[dayLower] = available;
        record.fallbackUsers[dayLower] = available ? null : fallbackUserId;
        record.markModified('days');
        record.markModified('fallbackUsers');
        await record.save();

        return record;
    }

    /**
     * Get available pre-sales users for today (used by round-robin).
     * Returns the list of user IDs that are available today.
     */
    async getAvailableUsersForToday(organization) {
        const orgConn = await getOrganizationConnection(organization);
        const Availability = getUserAvailabilityModel(orgConn);
        const ClientUser = getClientUserModel(orgConn);

        const today = new Date();
        const ws = getWeekStart(today);
        const dayName = getDayName(today);

        // Get all active pre-sales users
        const preSalesUsers = await ClientUser.find({
            isActive: true,
        })
            .sort({ _id: 1 })
            .select('_id')
            .lean();

        if (!preSalesUsers || preSalesUsers.length === 0) {
            return { availableUsers: [], fallbackMap: {} };
        }

        // Get availability records for this week
        const availabilities = await Availability.find({
            organization,
            weekStart: ws
        }).lean();

        const availMap = {};
        for (const a of availabilities) {
            availMap[a.userId.toString()] = a;
        }

        const availableUsers = [];
        const fallbackMap = {}; // maps unavailable userId -> fallback userId

        for (const user of preSalesUsers) {
            const uid = user._id.toString();
            const avail = availMap[uid];

            if (avail && avail.days && avail.days[dayName] === false) {
                // User is unavailable today
                const fallback = avail.fallbackUsers?.[dayName];
                if (fallback) {
                    fallbackMap[uid] = fallback.toString();
                }
                // Don't add to available list
            } else {
                // User is available (default or explicitly set)
                availableUsers.push(uid);
            }
        }

        return { availableUsers, fallbackMap };
    }
}

export const userAvailabilityService = new UserAvailabilityService();
