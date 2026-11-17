// npm run restore -- backups/luxurystay-2026-11-17-10-00-00  → replaces the database with that backup
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error('Give the backup folder, e.g. npm run restore -- backups/luxurystay-2026-...'); process.exit(1); }
await connectDB();
const { ObjectId } = mongoose.Types;
// turns saved ids and dates back into real ObjectIds / Dates
const revive = (v) => {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
  if (typeof v === 'string' && /^[a-f\d]{24}$/i.test(v)) return new ObjectId(v);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) return new Date(v);
  return v;
};
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const name = file.replace('.json', '');
  const docs = revive(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
  await mongoose.connection.db.collection(name).deleteMany({});
  if (docs.length) await mongoose.connection.db.collection(name).insertMany(docs);
  console.log(`${name}: ${docs.length}`);
}
await mongoose.disconnect();
console.log('\nRestore complete');
