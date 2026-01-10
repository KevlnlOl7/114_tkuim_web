import jwt from 'jsonwebtoken';

export function generateToken(user) {
    return jwt.sign(
        { sub: user._id.toString(), email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

export function generateRefreshToken(user) {
    return jwt.sign(
        { sub: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}
