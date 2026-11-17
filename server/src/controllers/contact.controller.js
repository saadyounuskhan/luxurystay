import { ContactMessage, Branch, Room, Feedback, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { notify } from '../services/notify.service.js';

export async function sendMessage(req, res) {
  const msg = await ContactMessage.create(req.body);
  await notify({ role: 'receptionist', title: 'New website message', message: `${msg.name}: ${msg.subject}`, link: '/staff/messages', type: 'contact' });
  ok(res, { id: msg._id }, 'Thank you! We will reply within 24 hours.', 201);
}

export async function listMessages(req, res) {
  ok(res, await ContactMessage.find().populate('branch', 'city').sort('-createdAt').limit(200));
}

export async function updateMessage(req, res) {
  const m = await ContactMessage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!m) throw new ApiError(404, 'Message not found');
  ok(res, m, 'Updated');
}

// Numbers for the About page
export async function publicStats(req, res) {
  const [branches, rooms, guests, reviews] = await Promise.all([
    Branch.countDocuments({ isActive: true }),
    Room.countDocuments(),
    User.countDocuments({ role: 'guest' }),
    Feedback.find().select('rating'),
  ]);
  const rating = reviews.length ? Number((reviews.reduce((s, f) => s + f.rating, 0) / reviews.length).toFixed(1)) : null;
  ok(res, { branches, rooms, guests, rating, reviews: reviews.length });
}
