import express from 'express';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth.js';
import * as signupRepo from '../repositories/signups.js';

const router = express.Router();

// protect all routes
router.use(authMiddleware);

// GET /api/signup
router.get('/', async (req, res) => {
    try {
        const data = req.user.role === 'admin'
            ? await signupRepo.findAll()
            : await signupRepo.findByOwner(req.user.id);
        res.json(data);
    } catch (error) {
        console.error('Error fetching signups:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/signup
router.post('/', async (req, res) => {
    try {
        const { content } = req.body; // Assuming 'content' or other fields
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // ownerId must be the logged-in user
        const saved = await signupRepo.create({
            content,
            ownerId: new ObjectId(req.user.id),
            creatorEmail: req.user.email
        });

        res.status(201).json(saved);
    } catch (error) {
        console.error('Error creating signup:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE /api/signup/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid ID' });
        }

        const item = await signupRepo.findById(id);
        if (!item) {
            return res.status(404).json({ error: 'Not found' });
        }

        // Authorization: Admin or Owner
        const isOwner = item.ownerId.toString() === req.user.id;
        if (req.user.role !== 'admin' && !isOwner) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await signupRepo.deleteById(id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting signup:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
