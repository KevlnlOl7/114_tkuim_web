import request from 'supertest';
import express from 'express';
import { router as signupRouter } from '../routes/signup.js';

const app = express();
app.use(express.json());
app.use('/api/signup', signupRouter);

describe('POST /api/signup 測試', () => {

  test('成功報名應回傳 201', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試用戶',
        email: `test${Date.now()}@example.com`,
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: ['frontend'],
        terms: true
      });

    if (response.status !== 201) {
      console.log('錯誤回應:', response.body);
    }

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('報名成功');
    expect(response.body.participant).toHaveProperty('id');
  });

  test('Email 格式錯誤應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'invalid-email',
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: ['frontend'],
        terms: true
      });

    expect(response.status).toBe(400);
  });

  test('手機格式錯誤應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'test@example.com',
        phone: '1234567890',
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: ['frontend'],
        terms: true
      });

    expect(response.status).toBe(400);
  });

  test('密碼不一致應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'test@example.com',
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Different123',
        interests: ['frontend'],
        terms: true
      });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/signup 測試', () => {

  test('應成功取得報名清單', async () => {
    const response = await request(app).get('/api/signup');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('data');
  });
});
