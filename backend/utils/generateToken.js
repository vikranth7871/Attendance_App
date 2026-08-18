import jwt from 'jsonwebtoken';

const generateToken = (userId) => {
    const secret = process.env.JWT_SECRET || 'iAttend_super_secret_jwt_key_2024R';
    return jwt.sign({ id: userId }, secret, {
        expiresIn: process.env.JWT_EXPIRE || '30d',
    });
};

export default generateToken;
