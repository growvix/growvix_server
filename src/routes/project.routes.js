import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { body, validationResult } from 'express-validator';
import { protect, authorizePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Validation middleware for adding project
const validateProject = [
    body('name').notEmpty().withMessage('Project name is required'),
    body('organization').notEmpty().withMessage('Organization is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, organization]
 *             properties:
 *               name:
 *                 type: string
 *               organization:
 *                 type: string
 *               location:
 *                 type: string
 *               group:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project added successfully
 *       400:
 *         description: Validation error
 */
router.post('/', validateProject, projectController.addProject);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization name
 *     responses:
 *       200:
 *         description: Projects fetched successfully
 */
router.get('/', projectController.getAllProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project fetched successfully
 *       404:
 *         description: Project not found
 */
router.get('/:id', projectController.getProjectById);

/**
 * @swagger
 * /api/projects/{id}/blocks:
 *   get:
 *     summary: Get project blocks
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project blocks fetched successfully
 */
router.get('/:id/blocks', projectController.getProjectBlocks);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               group:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project updated successfully
 */
router.put('/:id', protect, authorizePermission('edit_inventory'), projectController.updateProject);

export default router;
