import { Notification } from '../models/Notification.js';
import { getIO } from '../sockets/index.js';

// Saves a notification and pushes it live. Give either user (one person) or role (everyone with that role).
export async function notify({ user, role, title, message, link, type = 'info' }) {
  try {
    const n = await Notification.create({ user, role, title, message, link, type });
    const io = getIO();
    if (io) io.to(user ? `user:${user}` : `role:${role}`).emit('notification:new', n);
    return n;
  } catch {
    return null;
  }
}

// Live event without saving (e.g. room status changed)
export function emit(event, payload, target = 'staff') {
  const io = getIO();
  if (!io) return;
  if (target === 'staff') ['admin', 'manager', 'receptionist', 'housekeeping'].forEach((r) => io.to(`role:${r}`).emit(event, payload));
  else io.to(target).emit(event, payload);
}
