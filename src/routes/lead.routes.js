import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.js';
import { validateLead } from '../middleware/validateLead.middleware.js';

import { leadStageController } from '../controllers/leadStage.controller.js';

const router = Router();

router.post('/', validateLead, leadController.addLead);
router.get('/stages/:organization', leadStageController.getStages);

export default router;

