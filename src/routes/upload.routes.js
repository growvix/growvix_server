import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller.js';
import { uploadFloorPlan } from '../middleware/upload.middleware.js';

const router = Router();

// Upload floor plan images (up to 5 at once)
router.post('/floor-plans', uploadFloorPlan.array('images', 5), uploadController.uploadFloorPlanImages);

export default router;
