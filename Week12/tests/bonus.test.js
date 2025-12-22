import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server/app.js';
import { getCollection, connect, close } from '../server/db.js';

describe('Bonus Features', () => {
    let mongod;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongod.getUri();
        process.env.DB_NAME = 'test_db_bonus';
        process.env.JWT_SECRET = 'test_secret';
        await connect();
    });

    afterAll(async () => {
        await close();
        if (mongod) await mongod.stop();
    });

    beforeEach(async () => {
        await getCollection('users').deleteMany({});
        await getCollection('logs').deleteMany({});
    });

    it('should operate refresh token flow', async () => {
        // Signup
        await request(app).post('/auth/signup').send({
            email: 'refresh@test.com',
            password: '123'
        });

        // Login
        const loginRes = await request(app).post('/auth/login').send({
            email: 'refresh@test.com',
            password: '123'
        });
        const { refreshToken, token: initialToken } = loginRes.body;

        expect(refreshToken).toBeDefined();

        // Wait 1.2s to ensure new token has different 'iat' (JWT has second precision)
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Refresh
        const refreshRes = await request(app)
            .post('/auth/refresh')
            .send({ refreshToken });

        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body.token).toBeDefined();
        expect(refreshRes.body.token).not.toBe(initialToken);
    });

    it('should reset password flow', async () => {
        // Signup
        await request(app).post('/auth/signup').send({
            email: 'reset@test.com',
            password: 'oldpassword'
        });

        // Forgot Password
        const forgotRes = await request(app)
            .post('/auth/forgot-password')
            .send({ email: 'reset@test.com' });

        expect(forgotRes.status).toBe(200);
        const resetToken = forgotRes.body.resetToken;

        // Reset Password
        const resetRes = await request(app)
            .post('/auth/reset-password')
            .send({ token: resetToken, newPassword: 'newpassword' });

        expect(resetRes.status).toBe(200);

        // Login with Old (Fail)
        const failLogin = await request(app).post('/auth/login').send({
            email: 'reset@test.com',
            password: 'oldpassword'
        });
        expect(failLogin.status).toBe(401);

        // Login with New (Success)
        const successLogin = await request(app).post('/auth/login').send({
            email: 'reset@test.com',
            password: 'newpassword'
        });
        expect(successLogin.status).toBe(200);
    });

    it('should log operations', async () => {
        // Signup/Login
        await request(app).post('/auth/signup').send({
            email: 'log@test.com',
            password: '123'
        });
        const loginRes = await request(app).post('/auth/login').send({
            email: 'log@test.com',
            password: '123'
        });
        const token = loginRes.body.token;

        // Perform Action (Create Data)
        await request(app)
            .post('/api/signup')
            .set('Authorization', `Bearer ${token}`)
            .send({ content: 'Log This' });

        // Check Logs
        const logs = await getCollection('logs').find().toArray();
        expect(logs.length).toBeGreaterThan(0);

        const entry = logs.find(l => l.path === '/api/signup' && l.method === 'POST');
        expect(entry).toBeDefined();
        expect(entry.email).toBe('log@test.com');
    });
});
