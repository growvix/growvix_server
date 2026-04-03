import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All dashboard routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/dashboard/admin-stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin stats retrieved
 */
router.get('/admin-stats', authorize('admin', 'manager'), dashboardController.getAdminStats);

/**
 * @swagger
 * /api/dashboard/sales-summary:
 *   get:
 *     summary: Get sales summary (site visits, sales taken)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: executiveId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sales summary retrieved
 */
router.get('/sales-summary', authorize('admin', 'manager'), dashboardController.getSalesSummary);

/**
 * @swagger
 * /api/dashboard/presales-summary:
 *   get:
 *     summary: Get pre-sales summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: executiveId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pre-sales summary retrieved
 */
router.get('/presales-summary', authorize('admin', 'manager', 'user'), dashboardController.getPreSalesSummary);

/**
 * @swagger
 * /api/dashboard/marketing-summary:
 *   get:
 *     summary: Get marketing summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: campaignCategory
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marketing summary retrieved
 */
router.get('/marketing-summary', authorize('admin', 'manager', 'user'), dashboardController.getMarketingSummary);

/**
 * @swagger
 * /api/dashboard/executives:
 *   get:
 *     summary: Get list of executives
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Executives list retrieved
 */
router.get('/executives', authorize('admin', 'manager', 'user'), dashboardController.getExecutives);

export default router;
