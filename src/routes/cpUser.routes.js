import { Router } from 'express';
import { cpUserController } from '../controllers/cpUser.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/cp-users:
 *   post:
 *     summary: Create a new Channel Partner
 *     tags: [Channel Partners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cpName, email, phone, address]
 *             properties:
 *               cpName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               team:
 *                 type: string
 *               organization:
 *                 type: string
 *     responses:
 *       201:
 *         description: Channel Partner created successfully
 */
router.post('/', cpUserController.create);

/**
 * @swagger
 * /api/cp-users:
 *   get:
 *     summary: Get all Channel Partners for an organization
 *     tags: [Channel Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Channel Partners retrieved
 */
router.get('/', cpUserController.getAll);

/**
 * @swagger
 * /api/cp-users/{id}:
 *   get:
 *     summary: Get a Channel Partner by ID
 *     tags: [Channel Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel Partner retrieved
 *       404:
 *         description: Not found
 */
router.get('/:id', cpUserController.getOne);

/**
 * @swagger
 * /api/cp-users/{id}:
 *   put:
 *     summary: Update a Channel Partner
 *     tags: [Channel Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel Partner updated
 */
router.put('/:id', cpUserController.update);

/**
 * @swagger
 * /api/cp-users/{id}:
 *   delete:
 *     summary: Delete a Channel Partner
 *     tags: [Channel Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel Partner deleted
 */
router.delete('/:id', cpUserController.delete);

export default router;
