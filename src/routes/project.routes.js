import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { body, validationResult } from 'express-validator';

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

// Project CRUD routes
router.post('/', validateProject, projectController.addProject);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.get('/:id/blocks', projectController.getProjectBlocks);
router.put('/:id', projectController.updateProject);

export default router;
