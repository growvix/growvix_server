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
            uuid: result.uuid,
            organization: result.organization,
            firstName: result.firstName,
            lastName: result.lastName,
            email: result.email,
            token: result.token
        };

        res.status(200).json(ApiResponse.success('Login successful', responseData));
    });
}

export const authController = new AuthController();
