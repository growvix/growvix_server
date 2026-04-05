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
        const user = await userService.getUserById(req.params.id, req.user);

        res.status(200).json(ApiResponse.success('User retrieved', user));
    });

    // Get all users (filtered by organization)
    getAllUsers = asyncHandler(async (req, res) => {
        const { page, limit, organization } = req.query;
        // Use organization from query or from logged-in user
        const org = organization || req.user?.organization;

        let result;
        // All roles now fetch from global database for consistency in user listing
        // But for non-admins, we MUST enforce their own organization filter
        const finalOrg = req.user?.role === 'admin' ? org : req.user?.organization;

        result = await userService.getAllUsers({ 
            limit: Number(limit) || 50, 
            page: Number(page) || 1, 
            organization: finalOrg,
            requester: req.user
        });
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
    const currentUser = req.user;
    const targetUserId = req.params.id;

    const targetUser = await userService.getUserById(targetUserId);

    if (!targetUser) {
        return res.status(404).json(ApiResponse.error("User not found"));
    }

    // 🚫 USER cannot edit anyone
    // 🚫 USER cannot edit anyone EXCEPT themselves
    if (currentUser.role === "user" && currentUser._id.toString() !== targetUserId) {
        return res.status(403).json(
            ApiResponse.error("You are not allowed to edit users")
        );
    }

    // 🚫 MANAGER rules
    if (currentUser.role === "manager") {

        // ❌ cannot edit admin
        if (targetUser.role === "admin") {
            return res.status(403).json(
                ApiResponse.error("You cannot edit an admin")
            );
        }

        // ❌ cannot edit another manager (but can edit self)
        if (targetUser.role === "manager" && currentUser._id.toString() !== targetUserId) {
            return res.status(403).json(
                ApiResponse.error("You cannot edit another manager")
            );
        }
    }

    // 🚫 Prevent non-admin promoting to admin
    if (
        currentUser.role !== "admin" &&
        req.body.role === "admin"
    ) {
        return res.status(403).json(
            ApiResponse.error("You cannot promote a user to admin")
        );
    }

    // 🚫 Prevent non-admin assigning admin permissions
    if (
        currentUser.role !== "admin" &&
        req.body.permissions?.includes("manage_users")
    ) {
        return res.status(403).json(
            ApiResponse.error("You cannot assign admin-level permissions")
        );
    }

    // ✅ Allowed → update

    const updatedUser = await userService.updateUser(targetUserId, req.body);

    res.status(200).json(ApiResponse.success("User updated", updatedUser));
});

    // Delete user
   deleteUser = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const targetUser = await userService.getUserById(req.params.id);

    if (!targetUser) {
        return res.status(404).json(ApiResponse.error("User not found"));
    }

    // ❌ user cannot delete anyone
    if (currentUser.role === "user") {
        return res.status(403).json(ApiResponse.error("Not allowed"));
    }

    // ❌ manager restrictions
    if (currentUser.role === "manager") {
        if (targetUser.role === "admin" || targetUser.role === "manager") {
            return res.status(403).json(ApiResponse.error("Not allowed"));
        }
    }

    await userService.deleteUser(req.params.id);

    res.status(200).json(ApiResponse.success("User deleted"));
});
}

export const userController = new UserController();
