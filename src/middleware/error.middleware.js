import { AppError, ApiResponse } from '../utils/apiResponse.util.js';

export const errorHandler = (
    err,
    req,
    res,
    next
) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error (can substitute with a logger util later)
    console.error('ERROR :', err);

    if (err.name === 'ValidationError') {
        // Mongoose validation error
        err.statusCode = 400;
        err.message = Object.values(err.errors).map((val) => val.message).join(', ');
    }

    if (err.code === 11000) {
        // Mongoose duplicate key error
        err.statusCode = 400;
        err.message = 'Duplicate field value entered';
    }

    if (err.name === 'JsonWebTokenError') {
        err.statusCode = 401;
        err.message = 'Invalid token. Please log in again!';
    }

    if (err.name === 'TokenExpiredError') {
        err.statusCode = 401;
        err.message = 'Your token has expired! Please log in again.';
    }

    // Zod Error handling if needed, though usually handled in the verification middleware

    res.status(err.statusCode).json(ApiResponse.error(err.message, process.env.NODE_ENV === 'development' ? err.stack : undefined));
};
