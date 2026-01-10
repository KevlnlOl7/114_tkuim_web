import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, findUserById } from '../repositories/users.js';
import { generateToken, generateRefreshToken } from '../utils/generateToken.js';

const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userRole = (role === 'admin' || role === 'student') ? role : 'student';

        const user = await createUser({ email, passwordHash, role: userRole });

        res.status(201).json({
            message: 'User created successfully',
            user: { id: user._id, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Signup error details:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        res.json({
            message: 'Login successful',
            token,
            refreshToken,
            user: { id: user._id, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh Token required' });

    try {
        const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await findUserById(payload.sub);

        if (!user) return res.status(401).json({ error: 'User not found' });

        const newToken = generateToken(user);
        res.json({ token: newToken });
    } catch (error) {
        return res.status(403).json({ error: 'Invalid Refresh Token' });
    }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // In a real app, generate a unique token, save hash to DB, send email.
    // Here we'll just simulate it for "experience".
    const resetToken = jwt.sign({ sub: user._id, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Log it or return it for testing
    console.log(`[Forgot Password] Reset Token for ${email}: ${resetToken}`);
    res.json({ message: 'Reset token generated (check console)', resetToken });
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload.type !== 'reset') throw new Error('Invalid token type');

        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Dynamic import to avoid circular dep if any, though here it's fine.
        const { updateUser } = await import('../repositories/users.js');
        await updateUser(payload.sub, { passwordHash });

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
});

export default router;
