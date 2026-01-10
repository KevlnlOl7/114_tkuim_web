import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

let client;
let db;

export async function connect() {
  if (client) return;

  const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'week12_auth';

  client = new MongoClient(url);
  await client.connect();
  db = client.db(dbName);
  console.log(`Connected to MongoDB: ${dbName}`);

  // Create indexes
  const { createIndexes } = await import('./repositories/users.js');
  await createIndexes();
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function getCollection(name) {
  return getDb().collection(name);
}

export async function close() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}
