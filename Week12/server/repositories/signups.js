import { ObjectId } from 'mongodb';
import { getCollection } from '../db.js';

const COLLECTION_NAME = 'signups';

export async function findAll() {
    return getCollection(COLLECTION_NAME).find().toArray();
}

export async function findByOwner(ownerId) {
    return getCollection(COLLECTION_NAME).find({ ownerId: new ObjectId(ownerId) }).toArray();
}

export async function create(data) {
    const result = await getCollection(COLLECTION_NAME).insertOne({ ...data, createdAt: new Date() });
    return { ...data, _id: result.insertedId };
}

export async function deleteById(id) {
    const result = await getCollection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
}

export async function findById(id) {
    return getCollection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
}
