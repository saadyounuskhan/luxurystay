import { ServiceRequest, HousekeepingTask, MaintenanceRequest, Feedback, Reservation, Room, Folio, Notification } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { branchFilter } from '../utils/scope.js';
import { notify, emit } from '../services/notify.service.js';

// Fixed prices for paid services (added to the bill when done)
const SERVICE_PRICE = { room_service: 0, laundry: 1500, transport: 3500, wake_up: 0, housekeeping: 0, late_checkout: 5000, other: 0 };

// ================= Service requests =================
export async function createService(req, res) {
  const r = await Reservation.findOne({ guest: req.user._id, status: 'checked_in' });
  if (!r) throw new ApiError(400, 'You can request services only during your stay');
  const s = await ServiceRequest.create({ ...req.body, reservation: r._id, guest: req.user._id, room: r.room, price: SERVICE_PRICE[req.body.type] || 0 });
  await notify({ role: 'receptionist', title: 'New service request', message: `${req.body.type.replace('_', ' ')} · ${req.body.details || ''}`, link: '/staff/services', type: 'request' });
  ok(res, s, 'Request sent', 201);
}

export async function listServices(req, res) {
  const filter = req.user.role === 'guest' ? { guest: req.user._id } : {};
  if (req.query.status) filter.status = req.query.status;
  ok(res, await ServiceRequest.find(filter).populate('room', 'number').populate('guest', 'name').sort('-createdAt').limit(200));
}

export async function updateService(req, res) {
  const s = await ServiceRequest.findById(req.params.id);
  if (!s) throw new ApiError(404, 'Request not found');
  const wasDone = s.status === 'done';
  Object.assign(s, req.body);
  await s.save();
  if (!wasDone && s.status === 'done' && s.price > 0) {
    const folio = await Folio.findOne({ reservation: s.reservation });
    if (folio && folio.status === 'open') {
      folio.items.push({ type: s.type === 'laundry' ? 'laundry' : s.type === 'transport' ? 'transport' : 'other', description: s.type.replace('_', ' '), qty: 1, unitPrice: s.price });
      folio.recalculate();
      await folio.save();
    }
  }
  await notify({ user: s.guest, title: 'Request update', message: `Your ${s.type.replace('_', ' ')} request is ${s.status.replace('_', ' ')}` });
  emit('request:updated', { id: s._id, status: s.status }, `user:${s.guest}`);
  ok(res, s, 'Request updated');
}

// ================= Housekeeping =================
export async function listTasks(req, res) {
  const filter = { ...branchFilter(req) };
  if (req.user.role === 'housekeeping' && req.query.mine) filter.assignedTo = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  ok(res, await HousekeepingTask.find(filter).populate('room', 'number floor').populate('assignedTo', 'name').sort({ status: 1, priority: -1, dueAt: 1 }).limit(300));
}

export async function createTask(req, res) {
  const room = await Room.findById(req.body.room);
  if (!room) throw new ApiError(404, 'Room not found');
  const t = await HousekeepingTask.create({ ...req.body, branch: room.branch });
  if (t.assignedTo) await notify({ user: t.assignedTo, title: 'New task', message: `Room ${room.number}: ${t.type.replace('_', ' ')}`, type: 'task' });
  ok(res, t, 'Task created', 201);
}

export async function updateTask(req, res) {
  const t = await HousekeepingTask.findById(req.params.id).populate('room');
  if (!t) throw new ApiError(404, 'Task not found');
  const { status, assignedTo, notes, priority } = req.body;
  if (assignedTo !== undefined) t.assignedTo = assignedTo;
  if (notes !== undefined) t.notes = notes;
  if (priority) t.priority = priority;
  if (status && status !== t.status) {
    t.status = status;
    if (status === 'in_progress') t.startedAt = new Date();
    if (status === 'done' || status === 'inspected') {
      t.completedAt = new Date();
      const condition = status === 'inspected' ? 'inspected' : 'clean';
      await Room.updateOne({ _id: t.room._id }, { condition });
      emit('room:status', { room: t.room._id, number: t.room.number, status: t.room.status, condition });
    }
  }
  await t.save();
  emit('task:updated', { id: t._id, status: t.status });
  ok(res, t, 'Task updated');
}

// ================= Maintenance =================
export async function createTicket(req, res) {
  if (req.user.role === 'guest') {
    const stay = await Reservation.findOne({ guest: req.user._id, status: 'checked_in', room: req.body.room });
    if (!stay) throw new ApiError(403, 'You can only report issues in your own room');
  }
  const t = await MaintenanceRequest.create({ ...req.body, reportedBy: req.user._id });
  const room = await Room.findById(req.body.room);
  if (['high', 'urgent'].includes(t.priority) && room.status !== 'occupied') {
    room.status = 'maintenance';
    await room.save();
    emit('room:status', { room: room._id, number: room.number, status: 'maintenance' });
  }
  await notify({ role: 'housekeeping', title: 'Maintenance issue', message: `Room ${room.number}: ${t.title} (${t.priority})`, link: '/staff/maintenance', type: 'maintenance' });
  await notify({ role: 'manager', title: 'Maintenance issue', message: `Room ${room.number}: ${t.title}`, type: 'maintenance' });
  ok(res, t, 'Issue reported', 201);
}

export async function listTickets(req, res) {
  const filter = req.user.role === 'guest' ? { reportedBy: req.user._id } : {};
  if (req.query.status) filter.status = req.query.status;
  ok(res, await MaintenanceRequest.find(filter).populate('room', 'number floor').populate('reportedBy', 'name role').populate('assignedTo', 'name').sort('-createdAt').limit(200));
}

export async function updateTicket(req, res) {
  const t = await MaintenanceRequest.findById(req.params.id).populate('room');
  if (!t) throw new ApiError(404, 'Ticket not found');
  Object.assign(t, req.body);
  if (['resolved', 'closed'].includes(t.status) && !t.resolvedAt) {
    t.resolvedAt = new Date();
    if (t.room.status === 'maintenance') {
      await Room.updateOne({ _id: t.room._id }, { status: 'available', condition: 'dirty' });
      emit('room:status', { room: t.room._id, number: t.room.number, status: 'available', condition: 'dirty' });
    }
  }
  await t.save();
  await notify({ user: t.reportedBy, title: 'Issue update', message: `${t.title}: ${t.status.replace('_', ' ')}` });
  ok(res, t, 'Ticket updated');
}

// ================= Feedback =================
export async function createFeedback(req, res) {
  const r = await Reservation.findById(req.body.reservation);
  if (!r || r.guest.toString() !== req.user._id.toString()) throw new ApiError(403, 'Not your booking');
  if (r.status !== 'checked_out') throw new ApiError(400, 'You can rate after check-out');
  const f = await Feedback.create({ ...req.body, guest: req.user._id, branch: r.branch });
  await notify({ role: 'manager', title: 'New guest review', message: `${f.rating}★ ${f.comment?.slice(0, 60) || ''}`, type: 'feedback' });
  ok(res, f, 'Thank you for your feedback', 201);
}

export async function listFeedback(req, res) {
  const filter = req.user.role === 'guest' ? { guest: req.user._id } : branchFilter(req);
  ok(res, await Feedback.find(filter).populate('guest', 'name').populate('reply.by', 'name').sort('-createdAt').limit(200));
}

export async function publicFeedback(req, res) {
  ok(res, await Feedback.find({ isPublic: true, rating: { $gte: 4 } }).populate('guest', 'name').sort('-createdAt').limit(6));
}

export async function replyFeedback(req, res) {
  const f = await Feedback.findByIdAndUpdate(req.params.id, { reply: { text: req.body.text, by: req.user._id, at: new Date() } }, { new: true });
  if (!f) throw new ApiError(404, 'Feedback not found');
  ok(res, f, 'Reply saved');
}

// ================= Notifications =================
export async function myNotifications(req, res) {
  const items = await Notification.find({ $or: [{ user: req.user._id }, { role: req.user.role }] }).sort('-createdAt').limit(30);
  const unread = items.filter((n) => !n.isRead).length;
  ok(res, { items, unread });
}
export async function markRead(req, res) {
  await Notification.updateOne({ _id: req.params.id }, { isRead: true });
  ok(res, null, 'Marked read');
}
export async function markAllRead(req, res) {
  await Notification.updateMany({ $or: [{ user: req.user._id }, { role: req.user.role }], isRead: false }, { isRead: true });
  ok(res, null, 'All read');
}
