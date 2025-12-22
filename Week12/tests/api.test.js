import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import app from '../server/app.js';
import * as db from '../server/db.js';

let mongod;
let client;

// Mock the db connection to use Memory Server
// We need to overwrite the connect function in db.js or inject the client
// Since db.js exports singelton client/db, it's tricky to mock without dependency injection support in the app code.
// However, the app reads process.env.MONGODB_URI. We can set that.

describe('API Tests', () => {
    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        process.env.MONGODB_URI = uri;
        process.env.DB_NAME = 'test_db';
        process.env.JWT_SECRET = 'test_secret';

        // Connect app to this db
        await db.connect();
    });

    afterAll(async () => {
        await db.close();
        await mongod.stop();
    });

    // Clear db before each test block if needed? or just rely on separate data
    beforeEach(async () => {
        const database = db.getDb();
        await database.collection('users').deleteMany({});
        await database.collection('signups').deleteMany({});
    });

    describe('Auth', () => {
        it('should signup a student', async () => {
            const res = await request(app)
                .post('/auth/signup')
                .send({ email: 'student@test.com', password: 'pass', role: 'student' });
            expect(res.status).toBe(201);
            expect(res.body.user.email).toBe('student@test.com');
            expect(res.body.user.role).toBe('student');
        });

        it('should login and return token', async () => {
            // first signup
            await request(app).post('/auth/signup').send({ email: 'user@test.com', password: '123' });

            // then login
            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'user@test.com', password: '123' });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });
    });

    describe('Protected Routes /api/signup', () => {
        let studentToken;
        let adminToken;
        let studentId;

        beforeEach(async () => {
            // Create Student
            let res = await request(app).post('/auth/signup').send({ email: 's@t.com', password: '123', role: 'student' });
            // Login Student
            res = await request(app).post('/auth/login').send({ email: 's@t.com', password: '123' });
            studentToken = res.body.token;
            studentId = res.body.user.id;

            // Create Admin
            await request(app).post('/auth/signup').send({ email: 'a@t.com', password: '123', role: 'admin' });
            res = await request(app).post('/auth/login').send({ email: 'a@t.com', password: '123' });
            adminToken = res.body.token;
        });

        it('should deny unauthenticated access', async () => {
            const res = await request(app).get('/api/signup');
            expect(res.status).toBe(401); // or 403 depending on middleware
        });

        it('should allow authenticated student to post', async () => {
            const res = await request(app)
                .post('/api/signup')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ content: 'Hello World' });
            expect(res.status).toBe(201);
            expect(res.body.content).toBe('Hello World');
            expect(res.body.ownerId).toBe(studentId);
        });

        it('student should only see own data', async () => {
            // Student creates one
            await request(app).post('/api/signup').set('Authorization', `Bearer ${studentToken}`).send({ content: 'My Data' });

            // Admin creates one
            await request(app).post('/api/signup').set('Authorization', `Bearer ${adminToken}`).send({ content: 'Admin Data' });

            const res = await request(app).get('/api/signup').set('Authorization', `Bearer ${studentToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].content).toBe('My Data');
        });

        it('admin should see all data', async () => {
            // Student creates one
            await request(app).post('/api/signup').set('Authorization', `Bearer ${studentToken}`).send({ content: 'My Data' });
            // Admin creates one
            await request(app).post('/api/signup').set('Authorization', `Bearer ${adminToken}`).send({ content: 'Admin Data' });

            const res = await request(app).get('/api/signup').set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });

        it('student cannot delete others data', async () => {
            // Admin creates one
            const createRes = await request(app).post('/api/signup').set('Authorization', `Bearer ${adminToken}`).send({ content: 'Admin Data' });
            const id = createRes.body._id;

            const deleteRes = await request(app).delete(`/api/signup/${id}`).set('Authorization', `Bearer ${studentToken}`);
            expect(deleteRes.status).toBe(403);
        });

        it('owner can delete own data', async () => {
            const createRes = await request(app).post('/api/signup').set('Authorization', `Bearer ${studentToken}`).send({ content: 'My Data' });
            const id = createRes.body._id;

            const deleteRes = await request(app).delete(`/api/signup/${id}`).set('Authorization', `Bearer ${studentToken}`);
            expect(deleteRes.status).toBe(204);
        });
    });
});
