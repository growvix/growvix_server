import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller.js';

const router = Router();

// Campaign CRUD
router.get('/', campaignController.getAllCampaigns);
router.get('/stages', campaignController.getStages);
router.get('/:id', campaignController.getCampaignById);
router.post('/', campaignController.createCampaign);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

// Granular source / sub-source operations
router.post('/:id/sources', campaignController.addSource);
router.post('/:id/sources/:sourceId/sub-sources', campaignController.addSubSource);
router.put('/:id/sources/:sourceId/sub-sources/:subSourceId/project', campaignController.updateSubSourceProject);

export default router;
