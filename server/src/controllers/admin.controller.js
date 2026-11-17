import { User, GuestProfile, Setting, AuditLog, Reservation, Folio, Payment, Feedback, ServiceRequest } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { audit } from '../middleware/audit.js';

// ===== Staff =====
const STAFF_ROLES = ['manager', 'receptionist', 'housekeeping'];

export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  else filter.role = { $ne: 'guest' };
  if (req.user.role === 'manager') filter.branch = req.user.branch;
  if (req.query.q) filter.name = new RegExp(req.query.q.replace(/[^\w\s]/g, ''), 'i');
  ok(res, await User.find(filter).populate('branch', 'name city').sort('role name'));
}

// Admin creates staff. Admin role can never be given to anyone.
export async function createUser(req, res) {
  const { name, email, password, phone, role, branch } = req.body;
  if (!STAFF_ROLES.includes(role)) throw new ApiError(403, 'You can only create manager, receptionist or housekeeping accounts');
  if (!name || !email || !password || password.length < 8) throw new ApiError(400, 'Name, email and a password of 8+ characters are required');
  const user = await User.create({ name, email, password, phone, role, branch: branch || undefined });
  await audit(req, 'create', 'User', user._id, null, { email: user.email, role: user.role });
  ok(res, user, 'Staff account created', 201);
}

export async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(403, 'The admin account is protected. Admin edits own details from My account.');
  if (user.role === 'guest') throw new ApiError(400, 'Guests manage their own accounts');
  const { name, phone, role, branch, isActive, password } = req.body;
  if (role !== undefined && !STAFF_ROLES.includes(role)) throw new ApiError(403, 'Admin role cannot be given to anyone');
  const before = { name: user.name, role: user.role, branch: user.branch, isActive: user.isActive };
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) user.role = role;
  if (branch !== undefined) user.branch = branch || undefined;
  if (isActive !== undefined) user.isActive = !!isActive;
  if (password) {
    if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
    user.password = password;
    user.refreshTokenHash = undefined; // logs them out everywhere
  }
  await user.save();
  await audit(req, 'update', 'User', user._id, before, { name, role, branch, isActive, passwordReset: !!password });
  ok(res, user, 'Staff updated');
}

// ===== Guests =====
export async function listGuests(req, res) {
  const filter = { role: 'guest' };
  if (req.query.q) filter.$or = [{ name: new RegExp(req.query.q.replace(/[^\w\s@.]/g, ''), 'i') }, { email: new RegExp(req.query.q.replace(/[^\w\s@.]/g, ''), 'i') }];
  ok(res, await User.find(filter).sort('-createdAt').limit(100));
}
export async function getGuest(req, res) {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'guest') throw new ApiError(404, 'Guest not found');
  const [profile, stays] = await Promise.all([
    GuestProfile.findOne({ user: user._id }),
    Reservation.find({ guest: user._id }).populate('roomType', 'name').sort('-checkIn'),
  ]);
  ok(res, { user, profile, stays });
}
export async function updateMyProfile(req, res) {
  const profile = await GuestProfile.findOneAndUpdate({ user: req.user._id }, req.body, { new: true, upsert: true });
  ok(res, profile, 'Profile saved');
}

// GDPR: download everything we store about the guest
export async function exportMyData(req, res) {
  const id = req.user._id;
  const reservations = await Reservation.find({ guest: id });
  const data = {
    exportedAt: new Date(),
    account: await User.findById(id),
    profile: await GuestProfile.findOne({ user: id }),
    reservations,
    bills: await Folio.find({ guest: id }),
    payments: await Payment.find({ reservation: { $in: reservations.map((r) => r._id) } }),
    serviceRequests: await ServiceRequest.find({ guest: id }),
    feedback: await Feedback.find({ guest: id }),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="my-luxurystay-data.json"');
  res.json(data);
}

// GDPR: delete = anonymise (invoices are kept for tax law)
export async function deleteMyAccount(req, res) {
  const active = await Reservation.exists({ guest: req.user._id, status: { $in: ['confirmed', 'checked_in'] } });
  if (active) throw new ApiError(400, 'Cancel or finish your active bookings first');
  await User.updateOne({ _id: req.user._id }, {
    name: 'Deleted guest', email: `deleted-${req.user._id}@luxurystay.invalid`, phone: '', isActive: false,
    $unset: { refreshTokenHash: 1, avatarUrl: 1 },
  });
  await GuestProfile.deleteOne({ user: req.user._id });
  await audit(req, 'delete', 'User', req.user._id, null, { gdpr: true });
  res.clearCookie('ls_refresh', { path: '/api/v1/auth' });
  ok(res, null, 'Your account has been deleted');
}

// ===== Settings & audit =====
export async function getSettings(req, res) {
  ok(res, (await Setting.findOne({ branch: null })) || (await Setting.create({ branch: null })));
}
export async function updateSettings(req, res) {
  const s = await Setting.findOneAndUpdate({ branch: null }, req.body, { new: true, upsert: true, runValidators: true });
  await audit(req, 'update', 'Setting', s._id, null, req.body);
  ok(res, s, 'Settings saved');
}
export async function listAudit(req, res) {
  ok(res, await AuditLog.find().populate('user', 'name role').sort('-at').limit(200));
}
