import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller.js';
// Assuming some middleware for auth might be needed if user is to be extracted from req.user
// import { protect } from '../middleware/auth.middleware.js'; 

const router = Router();

// router.get('/', protect, campaignController.getAllCampaigns);
// router.post('/', protect, campaignController.createCampaign);

router.get('/', campaignController.getAllCampaigns);
router.post('/', campaignController.createCampaign);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

export default router;
