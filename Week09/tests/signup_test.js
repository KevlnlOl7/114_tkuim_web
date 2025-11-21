// tests/signup_test.js
import request from 'supertest';
import express from 'express';
import { router as signupRouter } from '../server/routes/signup.js';

// 建立測試用的 Express 應用
const app = express();
app.use(express.json());
app.use('/api/signup', signupRouter);

describe('POST /api/signup - 報名功能單元測試', () => {
  
  // ✅ 測試案例 1：成功報名
  test('應成功建立報名並回傳 201 狀態碼', async () => {
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
    
    // 驗證回應
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', '報名成功');
    expect(response.body).toHaveProperty('participant');
    expect(response.body.participant).toHaveProperty('id');
    expect(response.body.participant.name).toBe('測試用戶');
    expect(response.body.participant.interests).toEqual(['frontend', 'backend']);
  });

  // ❌ 測試案例 2：Email 格式錯誤
  test('Email 格式錯誤時應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'invalid-email', // 錯誤的 Email 格式
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: ['frontend'],
        terms: true
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Email');
  });

  // ❌ 測試案例 3：手機格式錯誤
  test('手機格式錯誤時應回傳 400', async () => {
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

  // ❌ 測試案例 4：密碼強度不足
  test('密碼強度不足時應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'test@example.com',
        phone: '0912345678',
        password: 'test', // 太短且沒有大寫和數字
        confirmPassword: 'test',
        interests: ['frontend'],
        terms: true
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/密碼/);
  });

  // ❌ 測試案例 5：密碼不一致
  test('確認密碼不一致時應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'test@example.com',
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Different123', // 與 password 不同
        interests: ['frontend'],
        terms: true
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('密碼');
  });

  // ❌ 測試案例 6：未同意條款
  test('未同意服務條款時應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'test@example.com',
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: ['frontend'],
        terms: false // 未同意
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('條款');
  });

  // ❌ 測試案例 7：缺少興趣
  test('未選擇興趣時應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        name: '測試',
        email: 'test@example.com',
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: [], // 空陣列
        terms: true
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('興趣');
  });

  // ❌ 測試案例 8：缺少必填欄位
  test('缺少姓名時應回傳 400', async () => {
    const response = await request(app)
      .post('/api/signup')
      .send({
        // 缺少 name
        email: 'test@example.com',
        phone: '0912345678',
        password: 'Test1234',
        confirmPassword: 'Test1234',
        interests: ['frontend'],
        terms: true
      });
    
    expect(response.status).toBe(400);
  });
});

describe('GET /api/signup - 查詢功能測試', () => {
  
  test('應成功取得所有報名清單', async () => {
    const response = await request(app).get('/api/signup');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
