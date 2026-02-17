import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.js';
import { validateLead } from '../middleware/validateLead.middleware.js';

import { leadStageController } from '../controllers/leadStage.controller.js';

const router = Router();

/**
 * @swagger
 * /api/leads:
 *   post:
 *     summary: Add a new lead
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [organization, profile]
 *             properties:
 *               organization:
 *                 type: string
 *               profile:
 *                 type: object
 *                 required: [name, phone]
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   location:
 *                     type: string
 *               acquired:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     campaign:
 *                       type: string
 *                     source:
 *                       type: string
 *                     sub_source:
 *                       type: string
 *                     medium:
 *                       type: string
 *               stage:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lead added successfully
 *       400:
 *         description: Validation error
 */
router.post('/', validateLead, leadController.addLead);

/**
 * @swagger
 * /api/leads/stages/{organization}:
 *   get:
 *     summary: Get lead stages for an organization
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization name
 *     responses:
 *       200:
 *         description: Stages fetched successfully
 */
router.get('/stages/:organization', leadStageController.getStages);

export default router;

