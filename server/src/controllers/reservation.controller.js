import { Reservation, Folio, User, GuestProfile } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { branchFilter } from '../utils/scope.js';
import { audit } from '../middleware/audit.js';
import { today, addDays } from '../utils/dates.js';
import * as booking from '../services/booking.service.js';

const isGuest = (req) => req.user.role === 'guest';

async function loadOwned(req) {
  const r = await Reservation.findById(req.params.id)
    .populate('guest', 'name email phone')
    .populate('roomType', 'name basePrice images')
    .populate('room', 'number floor status')
    .populate('branch', 'name city address phone checkInTime checkOutTime');
  if (!r) throw new ApiError(404, 'Booking not found');
  if (isGuest(req) && r.guest._id.toString() !== req.user._id.toString()) throw new ApiError(403, 'This is not your booking');
  return r;
}

export async function create(req, res) {
  let guestId = req.user._id;
  let source = 'online';
  if (!isGuest(req)) {
    source = 'walk_in';
    if (req.body.guest) guestId = req.body.guest;
    else if (req.body.walkIn) {
      const { name, email, phone } = req.body.walkIn;
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({ name, email, phone, role: 'guest', password: Math.random().toString(36).slice(2) + 'A1!' });
        await GuestProfile.create({ user: user._id, consent: { privacyAcceptedAt: new Date() } });
      }
      guestId = user._id;
    } else throw new ApiError(400, 'Select a guest or enter walk-in details');
  }
  const r = await booking.createReservation({
    guestId, roomTypeId: req.body.roomType, checkInRaw: req.body.checkIn, checkOutRaw: req.body.checkOut,
    adults: req.body.adults, children: req.body.children, specialRequests: req.body.specialRequests,
    source, createdBy: req.user._id, promoCode: req.body.promoCode,
  });
  await audit(req, 'create', 'Reservation', r._id, null, { code: r.code });
  ok(res, r, `Booking confirmed: ${r.code}`, 201);
}

export async function mine(req, res) {
  const list = await Reservation.find({ guest: req.user._id })
    .populate('roomType', 'name images').populate('room', 'number').populate('branch', 'name city')
    .sort({ checkIn: -1 });
  ok(res, list);
}

// Guest's current stay (checked in) or next upcoming one
export async function current(req, res) {
  const r = await Reservation.findOne({ guest: req.user._id, status: { $in: ['checked_in', 'confirmed'] }, checkOut: { $gte: today() } })
    .sort({ status: -1, checkIn: 1 })
    .populate('roomType', 'name images').populate('room', 'number floor').populate('branch', 'name city checkInTime checkOutTime');
  const folio = r ? await Folio.findOne({ reservation: r._id }) : null;
  ok(res, { reservation: r, folio });
}

export async function list(req, res) {
  const filter = { ...branchFilter(req) };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.code = new RegExp(req.query.q.replace(/[^\w-]/g, ''), 'i');
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const [items, total] = await Promise.all([
    Reservation.find(filter).populate('guest', 'name email').populate('roomType', 'name').populate('room', 'number')
      .sort({ checkIn: -1 }).skip((page - 1) * limit).limit(limit),
    Reservation.countDocuments(filter),
  ]);
  ok(res, items, 'OK', 200, { page, limit, total });
}

export async function getOne(req, res) {
  const r = await loadOwned(req);
  const folio = await Folio.findOne({ reservation: r._id });
  ok(res, { reservation: r, folio });
}

export async function cancel(req, res) {
  const r = await loadOwned(req);
  const result = await booking.cancel(r, !isGuest(req));
  await audit(req, 'update', 'Reservation', r._id, null, { status: 'cancelled', fee: result.fee });
  ok(res, result, result.fee ? `Cancelled. Fee: PKR ${result.fee}` : 'Booking cancelled');
}

export async function checkIn(req, res) {
  const r = await booking.checkIn(req.params.id);
  await audit(req, 'update', 'Reservation', r._id, null, { status: 'checked_in' });
  ok(res, r, 'Guest checked in');
}

export async function checkOut(req, res) {
  const result = await booking.checkOut(req.params.id);
  await audit(req, 'update', 'Reservation', req.params.id, null, { status: 'checked_out' });
  ok(res, result, 'Guest checked out');
}

export async function frontDesk(req, res) {
  const scope = branchFilter(req);
  const t = today();
  const pop = (q) => q.populate('guest', 'name phone').populate('roomType', 'name').populate('room', 'number');
  const [arrivals, departures, inHouse] = await Promise.all([
    pop(Reservation.find({ ...scope, status: 'confirmed', checkIn: { $lte: t } })).sort('checkIn'),
    pop(Reservation.find({ ...scope, status: 'checked_in', checkOut: { $lte: addDays(t, 0) } })).sort('checkOut'),
    pop(Reservation.find({ ...scope, status: 'checked_in' })).sort('checkOut'),
  ]);
  ok(res, { arrivals, departures, inHouse });
}
