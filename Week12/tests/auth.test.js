import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server/app.js';
import { getCollection, connect, close } from '../server/db.js';

describe('Auth Endpoints', () => {
    let mongod;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongod.getUri();
        process.env.DB_NAME = 'test_db_auth';
        process.env.JWT_SECRET = 'test_secret';
        await connect();
    });

    afterAll(async () => {
        await close();
        if (mongod) await mongod.stop();
    });

    beforeEach(async () => {
        // Clear users collection before each test
        await getCollection('users').deleteMany({});
    });

    it('should signup a student', async () => {
        const res = await request(app)
            .post('/auth/signup')
            .send({
                email: 'student@test.com',
                password: 'password123',
                role: 'student'
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toBe('student@test.com');
        expect(res.body.user.role).toBe('student');
    });

    it('should signup an admin', async () => {
        const res = await request(app)
            .post('/auth/signup')
            .send({
                email: 'admin@test.com',
                password: 'password123',
                role: 'admin'
            });

        expect(res.status).toBe(201);
        expect(res.body.user.role).toBe('admin');
    });

    it('should login and return a token', async () => {
        // First create user
        await request(app)
            .post('/auth/signup')
            .send({
                email: 'user@test.com',
                password: 'password123'
            });

        // Then login
        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'user@test.com',
                password: 'password123'
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.email).toBe('user@test.com');
    });

    it('should fail login with wrong password', async () => {
        await request(app)
            .post('/auth/signup')
            .send({
                email: 'user@test.com',
                password: 'password123'
            });

        const res = await request(app)
            .post('/auth/login')
            .send({
                email: 'user@test.com',
                password: 'wrongpassword'
            });

        expect(res.status).toBe(401);
    });
});
