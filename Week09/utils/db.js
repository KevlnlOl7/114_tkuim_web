// server/utils/db.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 取得目前檔案的路徑，並指向上一層的 data 資料夾
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data');
const DB_FILE = path.join(DB_PATH, 'participants.json');

// 確保資料夾存在
async function ensureDB() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(DB_PATH, { recursive: true });
  }
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, '[]', 'utf-8');
  }
}

export async function getAllParticipants() {
  await ensureDB();
  const data = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(data || '[]');
}

export async function getParticipantById(id) {
  const list = await getAllParticipants();
  return list.find(p => p.id === id);
}

export async function addParticipant(participant) {
  const list = await getAllParticipants();
  list.push(participant);
  await fs.writeFile(DB_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return participant;
}

export async function deleteParticipant(id) {
  const list = await getAllParticipants();
  const index = list.findIndex(p => p.id === id);
  if (index === -1) return null;

  const [removed] = list.splice(index, 1);
  await fs.writeFile(DB_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return removed;
}