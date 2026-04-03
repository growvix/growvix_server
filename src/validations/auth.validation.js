import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        phoneNumber: z.string().optional(),
        organization: z.string().min(1, "Organization is required"),
        profile: z.object({
            firstName: z.string().min(1, "First name is required"),
            lastName: z.string().optional(),
            email: z.string().email("Invalid email address"),
            phone: z.string().optional(),
            profileImagePath: z.string().optional()
        }),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(['user', 'admin', 'manager']).optional(),
        department: z.enum(['pre-sales', 'sales', 'post-sales']).optional(),
        permissions: z.array(z.string()).optional(),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
    }),
});
export const cploginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
    }),
});
