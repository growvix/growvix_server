import express from 'express';
const router = express.Router();
import SourceController from '../controllers/source.controller.js';
import { protect } from '../middleware/auth.middleware.js';

router.post('/', protect, SourceController.createSource);
router.get('/', protect, SourceController.getSources);

export default router;
