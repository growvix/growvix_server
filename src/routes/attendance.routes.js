import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/attendance/today:
 *   get:
 *     summary: Get today's attendance status for all users
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's attendance status retrieved
 */
router.get('/today', attendanceController.getTodayStatus);

/**
 * @swagger
 * /api/attendance/toggle-online:
 *   post:
 *     summary: Toggle user online (record login)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login recorded
 */
router.post('/toggle-online', attendanceController.toggleOnline);

/**
 * @swagger
 * /api/attendance/toggle-offline:
 *   post:
 *     summary: Toggle user offline (record logout)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout recorded
 */
router.post('/toggle-offline', attendanceController.toggleOffline);

/**
 * @swagger
 * /api/attendance/monthly/{userId}:
 *   get:
 *     summary: Get monthly attendance report for a user
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: number
 *       - in: query
 *         name: month
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Monthly attendance retrieved
 */
router.get('/monthly/:userId', attendanceController.getMonthlyAttendance);

/**
 * @swagger
 * /api/attendance/auto-logout:
 *   post:
 *     summary: Auto-logout all active sessions (admin only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Auto-logout completed
 */
router.post('/auto-logout', authorize('admin'), attendanceController.autoLogoutAll);

export default router;
