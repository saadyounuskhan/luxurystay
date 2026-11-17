import mongoose from 'mongoose';
import crypto from 'crypto';
import { Reservation, Room, RoomType, Folio, Setting, HousekeepingTask, GuestProfile, Invoice, PromoCode } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { toDay, today, nightsBetween } from '../utils/dates.js';
import { nextCode } from '../utils/generateCode.js';
import { notify, emit } from './notify.service.js';

export const ACTIVE = ['pending', 'confirmed', 'checked_in'];

// Atlas (online) supports transactions. A local MongoDB on your laptop usually does not,
// so if transactions are not available we run the same steps without one.
let txSupported = true;
async function runSafely(work) {
  if (txSupported) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(() => work(session));
      return;
    } catch (err) {
      const noTx = err.code === 20 || /replica set|Transaction numbers/i.test(err.message || '');
      if (!noTx) throw err;
      txSupported = false;
    } finally {
      await session.endSession();
    }
  }
  await work(null);
}

// Two stays overlap when: existing.checkIn < newCheckOut AND existing.checkOut > newCheckIn
const overlap = (checkIn, checkOut) => ({ checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn }, status: { $in: ACTIVE } });

export function parseStay(checkInRaw, checkOutRaw) {
  const checkIn = toDay(checkInRaw);
  const checkOut = toDay(checkOutRaw);
  if (isNaN(checkIn) || isNaN(checkOut)) throw new ApiError(400, 'Invalid dates');
  if (checkIn < today()) throw new ApiError(400, 'Check-in date cannot be in the past');
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) throw new ApiError(400, 'Check-out must be after check-in');
  if (nights > 30) throw new ApiError(400, 'Maximum stay is 30 nights');
  return { checkIn, checkOut, nights };
}

// Price for one night: weekend nights cost more (from settings)
export async function priceFor(roomType, checkIn, nights) {
  const s = (await Setting.findOne({ branch: null })) || {};
  const weekend = s.pricingRules?.weekendMultiplier || 1;
  let total = 0;
  for (let i = 0; i < nights; i++) {
    const d = new Date(checkIn.getTime() + i * 86400000);
    const isWeekend = [5, 6].includes(d.getUTCDay()); // Fri, Sat nights
    total += Math.round(roomType.basePrice * (isWeekend ? weekend : 1));
  }
  return { total, ratePerNight: Math.round(total / nights), taxRate: s.taxRate ?? 16 };
}

// For the search page: every room type in a branch with how many rooms are free
export async function searchAvailability({ branch, checkIn, checkOut, nights, adults = 1 }) {
  const types = await RoomType.find({ branch, isActive: true, 'capacity.adults': { $gte: adults } }).sort('basePrice');
  const busy = await Reservation.find({ branch, ...overlap(checkIn, checkOut), room: { $ne: null } }).distinct('room');
  const results = [];
  for (const t of types) {
    const free = await Room.countDocuments({ roomType: t._id, isOutOfOrder: false, _id: { $nin: busy } });
    const price = await priceFor(t, checkIn, nights);
    results.push({ roomType: t, available: free, nights, ...price });
  }
  return results;
}

// Creates a booking safely. Inside a transaction so two people can never get the same room.
export async function createReservation({ guestId, roomTypeId, checkInRaw, checkOutRaw, adults, children, specialRequests, source, createdBy, promoCode }) {
  const { checkIn, checkOut, nights } = parseStay(checkInRaw, checkOutRaw);
  const roomType = await RoomType.findById(roomTypeId);
  if (!roomType) throw new ApiError(404, 'Room type not found');
  if (adults > roomType.capacity.adults) throw new ApiError(400, `Max ${roomType.capacity.adults} adults for this room`);
  const price = await priceFor(roomType, checkIn, nights);
  const promo = promoCode ? await checkPromo(promoCode, nights) : null;
  const discount = promo ? Math.round((price.total * promo.percent) / 100) : 0;
  const code = await nextCode('LS');

  let reservation;
  await runSafely(async (session) => {
      const rooms = await Room.find({ roomType: roomTypeId, isOutOfOrder: false }).session(session);
      let chosen = null;
      for (const room of rooms) {
        const clash = await Reservation.exists({ room: room._id, ...overlap(checkIn, checkOut) }).session(session);
        if (!clash) { chosen = room; break; }
      }
      if (!chosen) throw new ApiError(409, 'Sorry, no rooms of this type are free for these dates');

      // Bumping version makes two parallel bookings of the same room conflict, so one retries
      await Room.updateOne({ _id: chosen._id }, { $inc: { version: 1 } }, { session });

      [reservation] = await Reservation.create([{
        code, guest: guestId, branch: roomType.branch, roomType: roomTypeId, room: chosen._id,
        checkIn, checkOut, nights, adults, children, specialRequests,
        status: 'confirmed', source, ratePerNight: price.ratePerNight, totalAmount: price.total, createdBy,
      }], { session });

      const folio = new Folio({
        reservation: reservation._id, guest: guestId, taxRate: price.taxRate,
        items: [{ type: 'room', description: `${roomType.name} × ${nights} night(s)`, qty: nights, unitPrice: price.ratePerNight }],
        discount,
      });
      folio.recalculate();
      await folio.save({ session });

      if (checkIn.getTime() === today().getTime()) {
        await Room.updateOne({ _id: chosen._id, status: 'available' }, { status: 'reserved' }, { session });
      }
  });

  if (promo) await PromoCode.updateOne({ _id: promo._id }, { $inc: { used: 1 } });

  await notify({ role: 'receptionist', title: 'New booking', message: `${code} · ${roomType.name} · ${nights} night(s)`, link: `/staff/reservations/${reservation._id}`, type: 'booking' });
  emit('booking:new', { id: reservation._id, code });
  return reservation;
}

export async function checkIn(reservationId) {
  const r = await Reservation.findById(reservationId).populate('room');
  if (!r) throw new ApiError(404, 'Booking not found');
  if (r.status !== 'confirmed') throw new ApiError(400, `Cannot check in a ${r.status} booking`);
  if (toDay(r.checkIn) > today()) throw new ApiError(400, 'Check-in date has not come yet');
  if (r.room.status === 'maintenance' || r.room.isOutOfOrder) throw new ApiError(400, 'Room is under maintenance, move the guest first');

  r.status = 'checked_in';
  r.checkedInAt = new Date();
  r.qrKeyToken = crypto.randomBytes(12).toString('hex');
  await r.save();
  await Room.updateOne({ _id: r.room._id }, { status: 'occupied' });
  emit('room:status', { room: r.room._id, number: r.room.number, status: 'occupied' });
  await notify({ user: r.guest, title: 'Welcome to LuxuryStay', message: `Room ${r.room.number} is ready. Your digital key is in your dashboard.`, link: '/guest' });
  return r;
}

export async function checkOut(reservationId) {
  const r = await Reservation.findById(reservationId).populate('room');
  if (!r) throw new ApiError(404, 'Booking not found');
  if (r.status !== 'checked_in') throw new ApiError(400, 'Guest is not checked in');
  const folio = await Folio.findOne({ reservation: r._id });
  folio.recalculate();
  if (folio.balance > 0) throw new ApiError(400, `Balance of PKR ${folio.balance.toLocaleString()} is still due`);

  folio.status = 'closed';
  await folio.save();
  r.status = 'checked_out';
  r.checkedOutAt = new Date();
  r.qrKeyToken = undefined;
  await r.save();

  await Room.updateOne({ _id: r.room._id }, { status: 'available', condition: 'dirty' });
  await HousekeepingTask.create({ room: r.room._id, branch: r.branch, type: 'checkout_clean', priority: 'high', dueAt: new Date(Date.now() + 2 * 3600000) });
  emit('room:status', { room: r.room._id, number: r.room.number, status: 'available', condition: 'dirty' });
  await notify({ role: 'housekeeping', title: 'Room needs cleaning', message: `Room ${r.room.number} checked out`, link: '/staff/housekeeping', type: 'task' });

  let invoice = await Invoice.findOne({ folio: folio._id });
  if (!invoice) invoice = await Invoice.create({ number: await nextCode('INV'), folio: folio._id, guest: r.guest, reservation: r._id, branch: r.branch, kind: 'final' });
  else if (invoice.kind !== 'final') { invoice.kind = 'final'; invoice.issuedAt = new Date(); await invoice.save(); }

  const s = (await Setting.findOne({ branch: null })) || {};
  const points = Math.round(folio.total * (s.loyalty?.pointsPerPKR ?? 0.01));
  const profile = await GuestProfile.findOne({ user: r.guest });
  if (profile) {
    profile.loyalty.points += points;
    profile.loyalty.tier = profile.loyalty.points >= 10000 ? 'platinum' : profile.loyalty.points >= 2000 ? 'gold' : 'silver';
    await profile.save();
  }
  await notify({ user: r.guest, title: 'Thank you for staying', message: `Invoice ${invoice.number} is ready. You earned ${points} points. Please rate your stay.`, link: '/guest' });
  return { reservation: r, invoice, points };
}

export async function cancel(reservation, byStaff) {
  if (!['pending', 'confirmed'].includes(reservation.status)) throw new ApiError(400, `Cannot cancel a ${reservation.status} booking`);
  const s = (await Setting.findOne({ branch: null })) || {};
  const freeHours = s.cancellationPolicy?.freeHours ?? 48;
  const hoursLeft = (new Date(reservation.checkIn) - Date.now()) / 3600000;
  let fee = 0;
  if (!byStaff && hoursLeft < freeHours) fee = Math.round((reservation.totalAmount * (s.cancellationPolicy?.feePercent ?? 20)) / 100);

  reservation.status = 'cancelled';
  reservation.cancelledAt = new Date();
  await reservation.save();
  const folio = await Folio.findOne({ reservation: reservation._id });
  if (folio) {
    folio.items = fee ? [{ type: 'other', description: 'Late cancellation fee', qty: 1, unitPrice: fee }] : [];
    folio.recalculate();
    folio.status = 'closed';
    await folio.save();
  }
  await Room.updateOne({ _id: reservation.room, status: 'reserved' }, { status: 'available' });
  return { reservation, fee };
}

// Checks a promo code. Returns the promo or throws a friendly error.
export async function checkPromo(rawCode, nights = 1) {
  const now = new Date();
  const promo = await PromoCode.findOne({ code: String(rawCode).trim().toUpperCase(), isActive: true });
  if (!promo) throw new ApiError(400, 'This promo code is not valid');
  if (promo.validFrom && promo.validFrom > now) throw new ApiError(400, 'This promo code is not active yet');
  if (promo.validTo && promo.validTo < now) throw new ApiError(400, 'This promo code has expired');
  if (promo.used >= promo.maxUses) throw new ApiError(400, 'This promo code has been fully used');
  if (nights < promo.minNights) throw new ApiError(400, `This code needs at least ${promo.minNights} nights`);
  return promo;
}
