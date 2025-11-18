// routes/signup.js
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import * as db from '../../utils/db.js';
const router = Router();

// Zod schema
const signupSchema = z.object({
  name: z.string().min(1, '姓名為必填'),
  email: z.string().email('Email 格式不正確'),
  phone: z.string().regex(/^09\d{8}$/, '手機需為 09 開頭 10 碼'),
  password: z.string()
    .min(8, '密碼需至少 8 碼')
    .regex(/[a-z]/, '密碼需包含小寫字母')
    .regex(/[A-Z]/, '密碼需包含大寫字母')
    .regex(/[0-9]/, '密碼需包含數字'),
  confirmPassword: z.string(),
  interests: z.array(z.string()).min(1, '至少選擇一個興趣'),
  terms: z.literal(true, { errorMap: () => ({ message: '請先同意服務條款' }) })
}).refine(data => data.password === data.confirmPassword, {
  message: '兩次密碼輸入不一致',
  path: ['confirmPassword']
});

// 1️⃣ GET /api/signup - 查看所有報名（根路徑，放最前面）
router.get('/', async (req, res, next) => {
  try {
    console.log('查看所有報名');
    const participants = await db.getAllParticipants();
    res.json({ total: participants.length, data: participants });
  } catch (error) {
    console.error('GET / error:', error);
    next(error);
  }
});

// 2️⃣ POST /api/signup - 新增報名
router.post('/', async (req, res, next) => {
  try {
    console.log('📥 收到 POST 請求');

    const validated = signupSchema.parse(req.body);

    // 檢查重複
    const participants = await db.getAllParticipants();
    if (participants.some(p => p.email === validated.email)) {
      return res.status(400).json({ error: '此 Email 已被註冊' });
    }

    if (participants.some(p => p.phone === validated.phone)) {
      return res.status(400).json({ error: '此手機號碼已被使用' });
    }

    const newParticipant = {
      id: nanoid(8),
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      interests: validated.interests,
      createdAt: new Date().toISOString()
    };

    await db.addParticipant(newParticipant);
    console.log('報名成功:', newParticipant.id);

    res.status(201).json({ message: '報名成功', participant: newParticipant });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors?.[0]?.message || '驗證失敗';
      return res.status(400).json({ error: firstError });
    }
    console.error('POST error:', error);
    next(error);
  }
});

// 3️⃣ GET /api/signup/:id - 查詢單一參與者（動態路由放後面）
router.get('/:id', async (req, res, next) => {
  try {
    console.log('查詢 ID:', req.params.id);

    const participant = await db.getParticipantById(req.params.id);

    if (!participant) {
      console.log('找不到 ID:', req.params.id);
      return res.status(404).json({ error: '找不到這位參與者' });
    }

    console.log('查詢成功:', participant.name);
    res.json({ participant });

  } catch (error) {
    console.error('GET /:id error:', error);
    next(error);
  }
});

// 4️⃣ DELETE /api/signup/:id - 刪除報名（動態路由放後面）
router.delete('/:id', async (req, res, next) => {
  try {
    console.log('刪除 ID:', req.params.id);

    const removed = await db.deleteParticipant(req.params.id);

    if (!removed) {
      console.log('找不到 ID:', req.params.id);
      return res.status(404).json({ error: '找不到這位參與者' });
    }

    console.log('刪除成功:', removed.name);
    res.json({ message: '已取消報名', participant: removed });

  } catch (error) {
    console.error('DELETE error:', error);
    next(error);
  }
});

export { router };