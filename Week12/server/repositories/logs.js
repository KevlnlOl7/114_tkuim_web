import { getCollection } from '../db.js';

const COLLECTION_NAME = 'logs';

export async function createLog(entry) {
    const result = await getCollection(COLLECTION_NAME).insertOne({
        ...entry,
        createdAt: new Date()
    });
    return result;
}

export async function findAllLogs() {
    return getCollection(COLLECTION_NAME).find().sort({ createdAt: -1 }).toArray();
}
