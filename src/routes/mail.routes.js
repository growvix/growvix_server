import { Router } from 'express';
import multer from 'multer';
import { mailController } from '../controllers/mail.controller.js';

const router = Router();

// Use memory storage — files are passed directly as Buffer to nodemailer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB per file
        files: 10,
    },
});

/**
 * @swagger
 * /api/mail/send:
 *   post:
 *     summary: Send an email to a lead
 *     tags: [Mail]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [to, subject, html]
 *             properties:
 *               to:
 *                 type: string
 *               subject:
 *                 type: string
 *               html:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Mail sending failed
 */
router.post('/send', upload.array('attachments', 10), mailController.sendLeadMail);

export default router;
