import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema, cploginSchema } from '../validations/auth.validation.js';
import { getPublicKey, decryptPassword } from '../utils/encryption.util.js';

const router = Router();

// Public key endpoint - frontend fetches this to encrypt passwords
router.get('/encryption-key', (req, res) => {
    res.json({ success: true, data: { publicKey: getPublicKey() } });
});

// Middleware to decrypt encrypted passwords before processing
const decryptPasswordMiddleware = (req, res, next) => {
    try {
        // Check if password looks like it's encrypted (base64 encoded RSA)
        if (req.body.password && req.body.password.length > 100) {
            req.body.password = decryptPassword(req.body.password);
        }
        next();
    } catch (err) {
        console.error("Decryption error:", err);
        return res.status(400).json({ success: false, message: 'Invalid encrypted password', error: err.message });
    }
};


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, organization]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               organization:
 *                 type: string
 *               department:
 *                 type: string
 *                 enum: [pre-sales, sales, post-sales]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/register', decryptPasswordMiddleware, validate(registerSchema), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: string
 *                     profile_id:
 *                       type: number
 *                     organization:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     token:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', decryptPasswordMiddleware, validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/impersonate:
 *   post:
 *     summary: Impersonate user (Admin/Manager only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetUserId]
 *             properties:
 *               targetUserId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Impersonation successful
 *       403:
 *         description: Not authorized
 */
import { protect, authorize } from '../middleware/auth.middleware.js';
router.post('/impersonate', protect, authorize('admin', 'manager'), authController.impersonate);

/**
 * @swagger
 * /api/auth/cplogin:
 *   post:
 *     summary: Login Channel Partner user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/Cplogin', decryptPasswordMiddleware, validate(cploginSchema), authController.cplogin);

export default router;
