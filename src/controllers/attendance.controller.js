import { attendanceService } from '../services/attendance.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class AttendanceController {
    /**
     * Toggle user online (login)
     * POST /api/attendance/toggle-online
     * Body: { userId }
     */
    toggleOnline = asyncHandler(async (req, res) => {
        const { userId } = req.body;
        const organization = req.user?.organization;

        if (!userId) {
            return res.status(400).json(ApiResponse.error('userId is required'));
        }

        const session = await attendanceService.toggleOnline(userId, organization);
        res.status(200).json(ApiResponse.success('User logged in successfully', session));
    });

    /**
     * Toggle user offline (logout)
     * POST /api/attendance/toggle-offline
     * Body: { userId }
     */
    toggleOffline = asyncHandler(async (req, res) => {
        const { userId } = req.body;
        const organization = req.user?.organization;

        if (!userId) {
            return res.status(400).json(ApiResponse.error('userId is required'));
        }

        const session = await attendanceService.toggleOffline(userId, organization);
        res.status(200).json(ApiResponse.success('User logged out successfully', session));
    });

    /**
     * Get today's attendance status for all users
     * GET /api/attendance/today
     */
    getTodayStatus = asyncHandler(async (req, res) => {
        const organization = req.user?.organization;
        const result = await attendanceService.getTodayStatus(organization);
        res.status(200).json(ApiResponse.success('Today\'s attendance retrieved', result));
    });

    /**
     * Get monthly attendance for a user
     * GET /api/attendance/monthly/:userId?year=2026&month=4
     */
    getMonthlyAttendance = asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const organization = req.user?.organization;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

        const result = await attendanceService.getMonthlyAttendance(userId, organization, year, month);
        res.status(200).json(ApiResponse.success('Monthly attendance retrieved', result));
    });

    /**
     * Auto-logout all active sessions (end of day trigger)
     * POST /api/attendance/auto-logout
     */
    autoLogoutAll = asyncHandler(async (req, res) => {
        const organization = req.user?.organization;
        const result = await attendanceService.autoLogoutAll(organization);
        res.status(200).json(ApiResponse.success('Auto-logout completed', result));
    });
}

export const attendanceController = new AttendanceController();
