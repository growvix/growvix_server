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

router.post('/', validateProject, projectController.addProject);
router.get('/', projectController.getAllProjects);

export default router;
