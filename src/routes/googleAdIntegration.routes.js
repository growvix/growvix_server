import { Router } from 'express';
import { googleAdsIntegrationController } from '../controllers/googleAdsIntegration.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Apply protect middleware to all routes
router.use(protect);

router.post('/', googleAdsIntegrationController.createIntegration);
router.get('/', googleAdsIntegrationController.getIntegrations);
router.get('/:id', googleAdsIntegrationController.getIntegrationById);
router.put('/:id', googleAdsIntegrationController.updateIntegration);
router.delete('/:id', googleAdsIntegrationController.deleteIntegration);

// Test data & mapping routes
router.get('/:id/test-data', googleAdsIntegrationController.getTestData);
router.put('/:id/mapping', googleAdsIntegrationController.saveMapping);

export default router;
