import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';

const COLLECTION_NAME = 'participants';

const collection = () => getDB().collection(COLLECTION_NAME);

// 初始化索引 (可在 db 連線後呼叫)
export async function ensureIndexes() {
  // 建立 email 唯一索引，避免重複報名
  await collection().createIndex({ email: 1 }, { unique: true });
}

export async function createParticipant(data) {
  const result = await collection().insertOne({
    ...data,
    status: data.status || 'pending', // 預設狀態
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return result.insertedId;
}

// 支援分頁的列表查詢
export async function listParticipants(page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  // 平行執行：取得總數 + 取得該頁資料
  const [total, items] = await Promise.all([
    collection().countDocuments(),
    collection().find()
      .sort({ createdAt: -1 }) // 新的在前
      .skip(skip)
      .limit(limit)
      .toArray()
  ]);

  return { items, total };
}

export async function updateParticipant(id, patch) {
  // 只允許更新特定欄位 (phone, status) 加上 updatedAt
  const allowedUpdates = {};
  if (patch.phone) allowedUpdates.phone = patch.phone;
  if (patch.status) allowedUpdates.status = patch.status;
  allowedUpdates.updatedAt = new Date();

  return collection().updateOne(
    { _id: new ObjectId(id) },
    { $set: allowedUpdates }
  );
}

export function deleteParticipant(id) {
  return collection().deleteOne({ _id: new ObjectId(id) });
}