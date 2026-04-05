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
    // 🛡️ Robust Role Normalization
    // Support multiple arguments, arrays, and comma-separated strings
    const allowedRoles = roles.flatMap(role => {
        if (Array.isArray(role)) return role.map(r => String(r).trim().toLowerCase());
        if (typeof role === 'string') return role.split(',').map(r => r.trim().toLowerCase());
        return [String(role).trim().toLowerCase()];
    });

    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('User not found in request context', 401));
        }

        const userRole = req.user.role?.toLowerCase().trim();

        // Admins bypass role restrictions
        if (userRole === 'admin') {
            return next();
        }

        // Managers often have organization-level access.
        // We explicitly check if 'manager' is in allowed set or if they match exactly.
        if (userRole && allowedRoles.includes(userRole)) {
            return next();
        }

        // If not matched, throw detailed error
        const rolesList = allowedRoles.join(', ');
        return next(
            new AppError(`Access Denied: Role '${req.user.role}' is not authorized for this action. Required one of: [${rolesList}]`, 403)
        );
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
