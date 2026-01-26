import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.js';
import { validateLead } from '../middleware/validateLead.middleware.js';

const router = Router();

router.post('/', validateLead, leadController.addLead);

export default router;
