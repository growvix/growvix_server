// gRPC/Connect RPC routes for Lead service
import { Router } from 'express';
import { leadServiceHandlers } from '../grpc/lead.handlers.js';

const router = Router();

/**
 * POST /grpc/lead/GetAllLeads
 * Connect protocol endpoint for GetAllLeads
 */
router.post('/lead/GetAllLeads', async (req, res) => {
    try {
        const result = await leadServiceHandlers.getAllLeads(req.body);
        res.json(result);
    } catch (error) {
        console.error('gRPC GetAllLeads error:', error);
        res.status(400).json({
            error: error.message || 'Failed to fetch leads'
        });
    }
});

export default router;
