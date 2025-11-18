import { Router } from 'express';
import { nanoid } from 'nanoid';
//加分挑戰（每項 +5）： 項目1 - 套用 zod 或 yup 做更完整的資料驗證。
import { z } from 'zod';
//加分挑戰： 項目2 - 將資料暫存於 JSON 檔案或 SQLite，並提供 GET /api/signup/:id 查詢。
import * as db from '../../utils/db.js';


const router = Router();
const participants = [];

// ✨ 使用 Zod 定義驗證 Schema
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

// 作業要求：後端-2 GET /api/signup 回傳目前報名清單與總數。
router.get('/', async (req, res, next) => {
  try {
    const participants = await db.getAllParticipants();
    res.json({ total: participants.length, data: participants });
  } catch (error) {
    next(error);
  }
});

//加分挑戰： 項目2 - 將資料暫存於 JSON 檔案或 SQLite，並提供 GET /api/signup/:id 查詢。
router.get('/:id', async (req, res, next) => {
  try {
    const participant = await db.getParticipantById(req.params.id);
    if (!participant) {
      return res.status(404).json({ error: '找不到這位參與者' });
    }

    res.json({ participant });
  } catch (error) {
    next(error);
  }
});

// 作業要求：後端-1 POST /api/signup 驗證所有欄位，失敗時回傳 400 與錯誤訊息。
router.post('/', async (req, res, next) => {
  try {
    // 記錄收到的資料（除錯用）
    console.log('Received data:', req.body);

    // Zod 驗證
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
    console.log('報名成功:', newParticipant.email);

    res.status(201).json({ message: '報名成功', participant: newParticipant });

  } catch (error) {
    // Zod 驗證錯誤
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));

      console.log('Zod 驗證失敗:', errors);

      // 回傳第一個錯誤訊息
      return res.status(400).json({
        error: errors[0]?.message || '資料驗證失敗'
      });
    }

    // 其他錯誤（檔案系統錯誤等）
    console.error('Server Error:', error);
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const removed = await db.deleteParticipant(req.params.id);

    if (!removed) {
      return res.status(404).json({ error: '找不到這位參與者' });
    }

    res.json({ message: '已取消報名', participant: removed });
  } catch (error) {
    next(error);
  }
});

export { router };
