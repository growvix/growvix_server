import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller.js';
import { uploadFloorPlan, uploadProfilePicture } from '../middleware/upload.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/upload/floor-plans:
 *   post:
 *     summary: Upload floor plan images
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     urls:
 *                       type: array
 *                       items:
 *                         type: string
 *                     count:
 *                       type: number
 *       400:
 *         description: No files uploaded
 */
// Upload floor plan images (up to 5 at once)
router.post('/floor-plans', uploadFloorPlan.array('images', 5), uploadController.uploadFloorPlanImages);

// Upload profile picture (single image)
router.post('/profile-picture', uploadProfilePicture.single('image'), uploadController.uploadProfilePicture);

export default router;
