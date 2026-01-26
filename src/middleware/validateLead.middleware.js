import { body, validationResult } from 'express-validator';

export const validateLead = [
    body('profile.name').notEmpty().withMessage('Name is required'),
    body('organization').notEmpty().withMessage('Organization is required'),
    body('profile.email').optional().isEmail().withMessage('Valid email is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
