import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.js';
import { validateLead } from '../middleware/validateLead.middleware.js';

import { leadStageController } from '../controllers/leadStage.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Protect all lead routes
router.use(protect);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     profile_id:
 *                       type: integer
 *                     exe_user:
 *                       type: string
 *       400:
 *         description: Validation error
 */
router.post('/', validateLead, leadController.addLead);

/**
 * @swagger
 * /api/leads/bulk-upload:
 *   post:
 *     summary: Bulk upload leads via Excel/CSV file
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               organization:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leads uploaded successfully
 *       400:
 *         description: Validation or file formatting error
 */
router.post('/bulk-upload', upload.single('file'), leadController.bulkUploadLeads);

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

/**
 * @swagger
 * /api/leads/search/{organization}/{profileId}:
 *   get:
 *     summary: Search lead by profile ID
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization name
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *         description: Numeric profile ID of the lead
 *     responses:
 *       200:
 *         description: Lead fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     profile_id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     exe_user:
 *                       type: string
 *       404:
 *         description: Lead not found
 */
router.get('/search/:organization/:profileId', leadController.getLeadByProfileId);

/**
 * @swagger
 * /api/leads/bulk-uploads/{organization}:
 *   get:
 *     summary: Get all bulk upload records for an organization
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bulk uploads fetched
 */
router.get('/bulk-uploads/:organization', leadController.getBulkUploads);

/**
 * @swagger
 * /api/leads/{organization}/{profileId}:
 *   delete:
 *     summary: Delete a lead by profile ID
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: organization
 *         required: true
 *       - in: path
 *         name: profileId
 *         required: true
 *     responses:
 *       200:
 *         description: Lead deleted successfully
 */
router.delete('/:organization/:profileId', leadController.deleteLeadByProfileId);

export default router;

