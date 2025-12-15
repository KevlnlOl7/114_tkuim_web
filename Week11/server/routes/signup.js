import express from 'express';
import {
  createParticipant,
  listParticipants,
  updateParticipant,
  deleteParticipant
} from '../repositories/participants.js';

const router = express.Router();

// POST: 建立報名
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: '缺少必要欄位 (name, email, phone)' });
    }

    const id = await createParticipant({ name, email, phone });
    res.status(201).json({ id });
  } catch (error) {
    // 處理 MongoDB 唯一索引衝突 (Duplicate Key Error)
    if (error.code === 11000) {
      return res.status(409).json({ error: '此 Email 已經報名過了' });
    }
    next(error);
  }
});

// GET: 取得清單 (支援分頁)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { items, total } = await listParticipants(page, limit);

    res.json({
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// PATCH: 更新
router.patch('/:id', async (req, res, next) => {
  try {
    const result = await updateParticipant(req.params.id, req.body);

    // matchedCount 為 0 代表資料庫找不到此 ID
    if (!result.matchedCount) {
      return res.status(404).json({ error: '找不到該筆資料' });
    }

    res.json({ message: '更新成功', updated: result.modifiedCount });
  } catch (error) {
    // 捕捉 Invalid ID 格式錯誤 (通常由 Repository 拋出)
    if (error.message.includes('ID')) {
       return res.status(400).json({ error: '無效的 ID 格式' });
    }
    next(error);
  }
});

// DELETE: 刪除
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteParticipant(req.params.id);

    if (!result.deletedCount) {
      return res.status(404).json({ error: '找不到該筆資料' });
    }

    res.status(204).end(); // 204 No Content
  } catch (error) {
    if (error.message.includes('ID')) {
       return res.status(400).json({ error: '無效的 ID 格式' });
    }
    next(error);
  }
});

export default router;
