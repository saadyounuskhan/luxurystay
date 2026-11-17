import { AuditLog } from '../models/AuditLog.js';
import { getIO } from '../sockets/index.js';

// Call inside controllers: await audit(req, 'update', 'Room', room._id, before, after)
export async function audit(req, action, entity, entityId, before, after) {
  try {
    const log = await AuditLog.create({
      user: req.user?._id,
      action,
      entity,
      entityId,
      before,
      after,
      ip: req.ip,
    });
    const io = getIO();
    const item = { _id: log._id, action, entity, at: log.at, after, user: req.user ? { name: req.user.name, role: req.user.role } : null };
    if (io) ['admin', 'manager'].forEach((r) => io.to(`role:${r}`).emit('activity', item));
  } catch {
    // audit must never break the main request
  }
}
