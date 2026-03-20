import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class AuthController {
    register = asyncHandler(async (req, res) => {
        const { user, token } = await authService.register(req.body);
        res.status(201).json(ApiResponse.success('User registered successfully', { user, token }));
    });

    login = asyncHandler(async (req, res) => {
        const result = await authService.login(req.body);

        // Flatten response as requested
        const responseData = {
            user_id: result.user_id,
            profile_id: result.profile_id,
            organization: result.organization,
            firstName: result.firstName,
            lastName: result.lastName,
            email: result.email,
            token: result.token,
            role: result.role,
            permissions: result.permissions || []
        };

        res.status(200).json(ApiResponse.success('Login successful', responseData));
    });
    cplogin = asyncHandler(async (req, res) => {
        const result = await authService.cplogin(req.body);

        // Flatten response as requested
        const responseData = {
            user_id: result.user_id,
            profile_id: result.profile_id,
            organization: result.organization,
            firstName: result.firstName,
            lastName: result.lastName,
            email: result.email,
            token: result.token,
            role: result.role,
            permissions: result.permissions || [],
            allowed_projects: result.allowed_projects || []
        };

        res.status(200).json(ApiResponse.success('Login successful', responseData));
    });
    impersonate = asyncHandler(async (req, res) => {
        const { targetUserId } = req.body;
        const result = await authService.impersonate(req.user._id, targetUserId);
        res.status(200).json(ApiResponse.success('Impersonation successful', result));
    });
}

export const authController = new AuthController();
