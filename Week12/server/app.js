import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',')
    : [];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // For development/homework, specific origin matching can be flaky.
        // Let's rely on ALLOWED_ORIGIN if present, otherwise default allow for localhost.
        if (allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }

        return callback(new Error(`The CORS policy for this site does not allow access from the specified Origin: ${origin}`), false);
    }
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

import authRouter from './routes/auth.js';
app.use('/auth', authRouter);

import signupRouter from './routes/signup.js';
app.use('/api/signup', signupRouter);

import logsRouter from './routes/logs.js';
app.use('/api/logs', logsRouter);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
