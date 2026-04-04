// gRPC/Connect RPC routes for Lead service
import { Router } from 'express';
import { leadServiceHandlers } from '../grpc/lead.handlers.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /grpc/lead/GetAllLeads:
 *   post:
 *     summary: Get all leads (gRPC/Connect protocol)
 *     tags: [gRPC]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [organization]
 *             properties:
 *               organization:
 *                 type: string
 *                 description: Organization name
 *               offset:
 *                 type: integer
 *                 description: Number of records to skip (default 0)
 *               limit:
 *                 type: integer
 *                 description: Maximum records to return (default 30)
 *               filters:
 *                 type: object
 *                 description: Optional filters
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Filter by lead name (case-insensitive, partial match)
 *                   source:
 *                     type: string
 *                     description: Filter by source (case-insensitive, partial match)
 *                   campaign:
 *                     type: string
 *                     description: Filter by campaign (case-insensitive, partial match)
 *                   status:
 *                     type: string
 *                     description: Filter by status (exact match)
 *     responses:
 *       200:
 *         description: Leads fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leads:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeadListItem'
 *                 total:
 *                   type: integer
 *                   description: Total number of matching leads
 *       400:
 *         description: Failed to fetch leads
 */
router.post('/lead/GetAllLeads', protect, async (req, res) => {
    try {
        const result = await leadServiceHandlers.getAllLeads(req.body, req.user);
        res.json(result);
    } catch (error) {
        console.error('gRPC GetAllLeads error:', error);
        res.status(400).json({
            error: error.message || 'Failed to fetch leads'
        });
    }
});

export default router;
