import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/participants.json');


async function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function getAllParticipants() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function saveParticipants(participants) {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(participants, null, 2), 'utf-8');
}

export async function getParticipantById(id) {
  const participants = await getAllParticipants();
  return participants.find(p => p.id === id);
}

export async function addParticipant(participant) {
  const participants = await getAllParticipants();
  participants.push(participant);
  await saveParticipants(participants);
  return participant;
}

export async function deleteParticipant(id) {
  const participants = await getAllParticipants();
  const index = participants.findIndex(p => p.id === id);

  if (index === -1) {
    return null;
  }

  const [removed] = participants.splice(index, 1);
  await saveParticipants(participants);
  return removed;
}
