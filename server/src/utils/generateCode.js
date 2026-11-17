import { Counter } from '../models/Counter.js';

// Gives codes like LS-2026-0001 or INV-2026-0001
export async function nextCode(prefix) {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${key}-${String(counter.seq).padStart(4, '0')}`;
}
