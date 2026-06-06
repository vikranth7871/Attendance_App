import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) {
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
