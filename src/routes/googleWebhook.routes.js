import { Router } from 'express';
import { googleWebhookController } from '../controllers/googleWebhook.controller.js';

const router = Router();

// POST /api/webhooks/google — Receive incoming events from Google
// No auth middleware here; Google calls this directly with the shared key
router.post('/google', googleWebhookController.receive);

// GET /api/webhooks/google/events?organization=X — View stored event logs (protected)
router.get('/google/events', googleWebhookController.getEvents);

export default router;
