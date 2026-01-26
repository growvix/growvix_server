import { userService } from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class UserController {
    // Get current user profile
    getMe = asyncHandler(async (req, res) => {
        // req.user is set by protect middleware
        res.status(200).json(ApiResponse.success('User profile retrieved', req.user));
    });

    // Get user by ID (Admin or public?)
    getUser = asyncHandler(async (req, res) => {
        const user = await userService.getUserById(req.params.id);
        res.status(200).json(ApiResponse.success('User retrieved', user));
    });

    // Get all users (filtered by organization)
    getAllUsers = asyncHandler(async (req, res) => {
        const { page, limit, organization } = req.query;
        // Use organization from query or from logged-in user
        const org = organization || req.user?.organization;

        let result;
        if (org) {
            // Get users from organization-specific database
            result = await userService.getOrganizationUsers(org, Number(limit) || 50, Number(page) || 1);
        } else {
            // Get all users from global database (admin view)
            result = await userService.getAllUsers(Number(limit) || 50, Number(page) || 1);
        }
        res.status(200).json(ApiResponse.success('Users retrieved', result));
    });

    // Create user
    createUser = asyncHandler(async (req, res) => {
        // Assign new user to the same organization as the creating user (admin)
        const userData = { ...req.body, organization: req.user?.organization };
        const user = await userService.createUser(userData);
        res.status(201).json(ApiResponse.success('User created successfully', user));
    });

    // Update user
    updateUser = asyncHandler(async (req, res) => {
        const user = await userService.updateUser(req.params.id, req.body);
        res.status(200).json(ApiResponse.success('User updated', user));
    });

    // Delete user
    deleteUser = asyncHandler(async (req, res) => {
        await userService.deleteUser(req.params.id);
        res.status(200).json(ApiResponse.success('User deleted'));
    });
}

export const userController = new UserController();
