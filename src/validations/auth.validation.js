import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        phoneNumber: z.string().min(1, "Phone number is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
        profile: z.object({
            firstName: z.string().min(1, "First name is required"),
            lastName: z.string().min(1, "Last name is required"),
            email: z.string().email("Invalid email address"),
            phone: z.string().optional(),
            profileImagePath: z.string().optional()
        }),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(['user', 'admin']).optional(),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
    }),
});
