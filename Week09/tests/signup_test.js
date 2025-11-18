// 加分挑戰（每項 +5）：項目3 - 撰寫 Jest / Vitest 後端單元測試，模擬 POST /api/signup。
import request from 'supertest';
import express from 'express';
import { router as signupRouter } from '../routes/signup.js';

// 建立測試用的 Express 應用
const app = express();
app.use(express.json());
app.use('/api/signup', signupRouter);

describe('POST /api/signup', () => {
  test('成功報名 - 應回傳 201 與參與者資料', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試用戶',
        email: `test${Date.now()}@example.com`, // 使用時間戳避免重複
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: ['frontend', 'backend'],
        terms: true
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('報名成功');
    expect(response.body.participant).toHaveProperty('id');
    expect(response.body.participant.name).toBe('測試用戶');
  });

  test('Email 格式錯誤 - 應回傳 400', async () => {
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
    expect(response.body.error).toContain('Email');
  });

  test('手機格式錯誤 - 應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'test@example.com',
        phone: '1234567890', // 不是 09 開頭
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: ['frontend'],
        terms: true
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('手機');
  });

  test('密碼不一致 - 應回傳 400', async () => {
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
    expect(response.body.error).toContain('密碼');
  });

  test('未同意條款 - 應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'test@example.com',
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: ['frontend'],
        terms: false
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('條款');
  });
});

describe('GET /api/signup', () => {
  test('應回傳清單與總數', async () => {
    const response = await request(app).get('/api/signup');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
