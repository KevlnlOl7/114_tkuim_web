import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server/app.js';
import { getCollection, connect, close } from '../server/db.js';

describe('API Endpoints', () => {
    let studentToken;
    let adminToken;
    let studentId;
    let mongod;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongod.getUri();
        process.env.DB_NAME = 'test_db_api';
        process.env.JWT_SECRET = 'test_secret';
        await connect();
    });

    afterAll(async () => {
        await close();
        if (mongod) await mongod.stop();
    });

    beforeEach(async () => {
        await getCollection('users').deleteMany({});
        await getCollection('signups').deleteMany({});

        // Create Student
        const studentRes = await request(app).post('/auth/signup').send({
            email: 'student@test.com',
            password: '123',
            role: 'student'
        });
        const loginStudent = await request(app).post('/auth/login').send({
            email: 'student@test.com',
            password: '123'
        });
        studentToken = loginStudent.body.token;
        studentId = loginStudent.body.user.id;

        // Create Admin
        await request(app).post('/auth/signup').send({
            email: 'admin@test.com',
            password: '123',
            role: 'admin'
        });
        const loginAdmin = await request(app).post('/auth/login').send({
            email: 'admin@test.com',
            password: '123'
        });
        adminToken = loginAdmin.body.token;
    });

    it('should protect /api/signup routes', async () => {
        const res = await request(app).get('/api/signup');
        expect(res.status).toBe(401);
    });

    it('should allow student to create and read own data', async () => {
        // Create
        const createRes = await request(app)
            .post('/api/signup')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ content: 'My Data' });

        expect(createRes.status).toBe(201);
        expect(createRes.body.content).toBe('My Data');
        expect(createRes.body.ownerId).toBe(studentId);

        // Read
        const getRes = await request(app)
            .get('/api/signup')
            .set('Authorization', `Bearer ${studentToken}`);

        expect(getRes.status).toBe(200);
        expect(getRes.body).toHaveLength(1);
        expect(getRes.body[0].content).toBe('My Data');
    });

    it('should allow admin to see all data', async () => {
        // Student creates data
        await request(app)
            .post('/api/signup')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ content: 'Student Data' });

        // Admin checks
        const res = await request(app)
            .get('/api/signup')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].content).toBe('Student Data');
    });

    it('should allow owner to delete data', async () => {
        // Create
        const createRes = await request(app)
            .post('/api/signup')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ content: 'To Delete' });
        const id = createRes.body._id;

        // Delete
        const delRes = await request(app)
            .delete(`/api/signup/${id}`)
            .set('Authorization', `Bearer ${studentToken}`);

        expect(delRes.status).toBe(204);

        // Verify gone
        const getRes = await request(app)
            .get('/api/signup')
            .set('Authorization', `Bearer ${studentToken}`);
        expect(getRes.body).toHaveLength(0);
    });

    it('should allow admin to delete any data', async () => {
        // Create by student
        const createRes = await request(app)
            .post('/api/signup')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ content: 'Admin Delete Target' });
        const id = createRes.body._id;

        // Admin Delete
        const delRes = await request(app)
            .delete(`/api/signup/${id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(delRes.status).toBe(204);
    });
});
