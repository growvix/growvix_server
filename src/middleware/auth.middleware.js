import jwt from 'jsonwebtoken';
import { env } from '../config/index.js';
import { AppError } from '../utils/apiResponse.util.js';
import { User } from '../models/user.model.js';

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('Not authorized, no token', 401));
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        
        let user = await User.findById(decoded.id);
        
        // If not found in User model, check GlobalCpUser model (for Channel Partners)
        if (!user) {
            const { GlobalCpUser } = await import('../models/cpUser.model.js');
            user = await GlobalCpUser.findById(decoded.id);
        }

        if (!user) {
            return next(new AppError('User not found with this token', 401));
        }

        req.user = user;
        next();
    } catch (error) {
        return next(new AppError('Not authorized, token failed', 401));
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        // Admins bypass role restrictions
        if (req.user && req.user.role === 'admin') {
            return next();
        }

        if (!req.user || !roles.includes(req.user.role) ) {
            return next(
                new AppError(`User role ${req.user?.role} is not authorized to access this route`, 403)
            );
        }
        next();
    };
};

export const authorizePermission = (permission) => {
    return (req, res, next) => {
        // Admins bypass permission restrictions
        if (req.user && req.user.role === 'admin') {
            return next();
        }

        const hasPermission = req.user && req.user.permissions && req.user.permissions.includes(permission);

        if (!hasPermission) {
            return next(
                new AppError(`User is not authorized to access this route. Requires permission: ${permission}`, 403)
            );
        }
        next();
    };
};
