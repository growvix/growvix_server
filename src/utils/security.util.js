import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/index.js';

export const signToken = (id, role) => {
    return jwt.sign({ id, role }, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    });
};

export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};
