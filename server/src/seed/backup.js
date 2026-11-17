// npm run backup  → saves every collection to server/backups/<date>/<name>.json
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';

await connectDB();
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const dir = path.resolve('backups', `luxurystay-${stamp}`);
fs.mkdirSync(dir, { recursive: true });
const collections = await mongoose.connection.db.listCollections().toArray();
for (const { name } of collections) {
  const docs = await mongoose.connection.db.collection(name).find().toArray();
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
  console.log(`${name}: ${docs.length}`);
}
await mongoose.disconnect();
console.log(`\nBackup saved in ${dir}`);
