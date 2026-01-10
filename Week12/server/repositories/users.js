import { getCollection } from '../db.js';
import { ObjectId } from 'mongodb';

export async function findUserByEmail(email) {
  return getCollection('users').findOne({ email });
}

export async function findUserById(id) {
  return getCollection('users').findOne({ _id: new ObjectId(id) });
}

export async function createUser({ email, passwordHash, role = 'student' }) {
  const doc = { email, passwordHash, role, createdAt: new Date() };
  const result = await getCollection('users').insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function createIndexes() {
  await getCollection('users').createIndex({ email: 1 }, { unique: true });
}

export async function updateUser(id, update) {
  const { ObjectId } = await import('mongodb');
  return getCollection('users').updateOne({ _id: new ObjectId(id) }, { $set: update });
}
