import { createLog } from '../repositories/logs.js';

export async function loggerMiddleware(req, res, next) {
    if (req.user) {
        const entry = {
            userId: req.user.id,
            email: req.user.email,
            method: req.method,
            path: req.originalUrl,

        };
        createLog(entry).catch(err => console.error('Logging failed:', err));
    }
    next();
}
