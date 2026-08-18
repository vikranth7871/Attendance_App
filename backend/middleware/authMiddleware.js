import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

export const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'iAttend_super_secret_jwt_key_2024R';
        const decoded = jwt.verify(token, secret);
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        if (!result.rows[0]) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }
        const user = result.rows[0];
        delete user.password;
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Role ${req.user?.role} is not authorized to access this route` });
        }
        next();
    };
};

export const authorizePermissions = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Admin has all permissions implicitly
        if (req.user.role === 'admin') {
            return next();
        }

        const hasPermission = permissions.some(permission => req.user.permissions && req.user.permissions.includes(permission));
        if (!hasPermission) {
            return res.status(403).json({ message: 'You do not have the required permissions' });
        }
        next();
    };
};
