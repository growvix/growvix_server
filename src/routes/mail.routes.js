import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { mailController } from '../controllers/mail.controller.js';
import { mailTemplateController } from '../controllers/mailTemplate.controller.js';
import { mailConfigController } from '../controllers/mailConfig.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ─── Multer for email sending (memory storage) ───
const uploadMemory = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB per file
        files: 10,
    },
});

// ─── Multer for template attachments (disk storage) ───
const templateUploadDir = path.join(__dirname, '../../uploads/mail_templates');
if (!fs.existsSync(templateUploadDir)) {
    fs.mkdirSync(templateUploadDir, { recursive: true });
}

const templateStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, templateUploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const uploadTemplate = multer({
    storage: templateStorage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10,
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDFs are allowed'), false);
        }
    },
});

// ─── Send mail route ───
router.post('/send', uploadMemory.array('attachments', 10), mailController.sendLeadMail);

// ─── Mail Template CRUD routes ───
router.get('/templates', mailTemplateController.getAll);
router.get('/templates/:id', mailTemplateController.getById);
router.post('/templates', uploadTemplate.array('attachments', 10), mailTemplateController.create);
router.put('/templates/:id', uploadTemplate.array('attachments', 10), mailTemplateController.update);
router.delete('/templates/:id', mailTemplateController.delete);

// ─── Mail Config CRUD routes ───
router.get('/', mailConfigController.getAll);
router.get('/:id', mailConfigController.getById);
router.post('/', mailConfigController.create);
router.put('/:id', mailConfigController.update);
router.delete('/:id', mailConfigController.delete);

export default router;
