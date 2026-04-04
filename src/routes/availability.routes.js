import { Router } from 'express';
import { userAvailabilityController } from '../controllers/userAvailability.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/availability/weekly:
 *   get:
 *     summary: Get weekly availability chart for all pre-sales users
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekStart
 *         schema:
 *           type: string
 *         description: Monday date (YYYY-MM-DD) of the week. Defaults to current week.
 *     responses:
 *       200:
 *         description: Weekly availability retrieved
 */
router.get('/weekly', userAvailabilityController.getWeeklyAvailability);

/**
 * @swagger
 * /api/availability/toggle:
 *   post:
 *     summary: Toggle a user's availability for a specific day
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, day, available]
 *             properties:
 *               userId:
 *                 type: string
 *               weekStart:
 *                 type: string
 *                 description: Monday date (YYYY-MM-DD). Defaults to current week.
 *               day:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *               available:
 *                 type: boolean
 *               fallbackUserId:
 *                 type: string
 *                 description: Required when available=false. User who takes over the work.
 *     responses:
 *       200:
 *         description: Availability toggled
 */
router.post('/toggle', authorize('admin', 'manager'), userAvailabilityController.toggleAvailability);

export default router;
