import { userAvailabilityService } from '../services/userAvailability.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class UserAvailabilityController {
    /**
     * Get weekly availability chart for all pre-sales users
     * GET /api/availability/weekly?weekStart=2026-04-06
     */
    getWeeklyAvailability = asyncHandler(async (req, res) => {
        const organization = req.user?.organization;
        const { weekStart } = req.query;

        const result = await userAvailabilityService.getWeeklyAvailability(organization, weekStart || null);
        res.status(200).json(ApiResponse.success('Weekly availability retrieved', result));
    });

    /**
     * Toggle a user's availability for a specific day
     * POST /api/availability/toggle
     * Body: { userId, weekStart, day, available, fallbackUserId }
     */
    toggleAvailability = asyncHandler(async (req, res) => {
        const organization = req.user?.organization;
        const { userId, weekStart, day, available, fallbackUserId } = req.body;

        if (!userId || !day || available === undefined) {
            return res.status(400).json(ApiResponse.error('userId, day, and available are required'));
        }

        const result = await userAvailabilityService.toggleAvailability(
            organization,
            userId,
            weekStart || null,
            day,
            available,
            fallbackUserId || null
        );

        res.status(200).json(ApiResponse.success(
            available ? 'User marked as available' : 'User marked as unavailable',
            result
        ));
    });
}

export const userAvailabilityController = new UserAvailabilityController();
