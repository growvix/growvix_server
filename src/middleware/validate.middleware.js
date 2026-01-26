import { ZodError } from 'zod';
import { AppError } from '../utils/apiResponse.util.js';

export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            const message = error.issues.map((e) => e.message).join(', ');
            return next(new AppError(message, 400));
        }
        next(error);
    }
};
