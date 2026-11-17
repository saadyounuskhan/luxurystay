import PDFDocument from 'pdfkit';
import { PromoCode, RoomType, Room, Reservation, Feedback, NightAudit, AuditLog, Branch, Setting } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { audit } from '../middleware/audit.js';
import { emit } from '../services/notify.service.js';
import { toDay, today, addDays, ymd, nightsBetween } from '../utils/dates.js';
import { checkPromo, priceFor, ACTIVE } from '../services/booking.service.js';
import { runNightAudit } from '../services/nightAudit.service.js';

// ===================== Promo codes =====================
export const listPromos = async (req, res) => ok(res, await PromoCode.find().sort('-createdAt'));

export async function createPromo(req, res) {
  const { code, description, percent, maxUses, minNights, validFrom, validTo } = req.body;
  if (!code || !percent) throw new ApiError(400, 'Code and percent are required');
  const p = await PromoCode.create({ code, description, percent, maxUses, minNights, validFrom: validFrom || undefined, validTo: validTo || undefined, createdBy: req.user._id });
  await audit(req, 'create', 'PromoCode', p._id, null, { code: p.code, percent: p.percent });
  ok(res, p, `Promo ${p.code} created`, 201);
}

export async function updatePromo(req, res) {
  const allowed = ['description', 'percent', 'maxUses', 'minNights', 'validFrom', 'validTo', 'isActive'];
  const changes = Object.fromEntries(allowed.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  const p = await PromoCode.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
  if (!p) throw new ApiError(404, 'Promo not found');
  await audit(req, 'update', 'PromoCode', p._id, null, changes);
  ok(res, p, 'Promo updated');
}

// Public: check a code before booking and show the saving
export async function validatePromo(req, res) {
  const nights = Number(req.query.nights) || 1;
  const promo = await checkPromo(req.query.code || '', nights);
  const total = Number(req.query.total) || 0;
  ok(res, { code: promo.code, percent: promo.percent, description: promo.description, discount: Math.round((total * promo.percent) / 100) }, `${promo.percent}% off applied`);
}

// ===================== Availability calendar (price per day) =====================
export async function calendar(req, res) {
  const type = await RoomType.findById(req.query.roomType);
  if (!type) throw new ApiError(404, 'Room type not found');
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : ymd(new Date()).slice(0, 7);
  const start = toDay(`${month}-01`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const total = await Room.countDocuments({ roomType: type._id, isOutOfOrder: false });
  const stays = await Reservation.find({ roomType: type._id, status: { $in: ACTIVE }, checkIn: { $lt: end }, checkOut: { $gt: start } }).select('checkIn checkOut');
  const days = [];
  for (let d = start; d < end; d = addDays(d, 1)) {
    const booked = stays.filter((r) => r.checkIn <= d && r.checkOut > d).length;
    const { total: price } = await priceFor(type, d, 1);
    days.push({ date: ymd(d), available: Math.max(0, total - booked), price, past: d < today() });
  }
  ok(res, { month, totalRooms: total, days });
}

// ===================== Reviews for one room type =====================
export async function roomReviews(req, res) {
  const resIds = await Reservation.find({ roomType: req.params.id }).distinct('_id');
  const list = await Feedback.find({ reservation: { $in: resIds }, isPublic: true }).populate('guest', 'name').sort('-createdAt').limit(20);
  const avg = list.length ? Number((list.reduce((s, f) => s + f.rating, 0) / list.length).toFixed(1)) : null;
  ok(res, { average: avg, count: list.length, items: list });
}

// ===================== Move a booking to another room (drag & drop on calendar) =====================
export async function moveReservation(req, res) {
  const r = await Reservation.findById(req.params.id).populate('room');
  if (!r) throw new ApiError(404, 'Booking not found');
  if (!['confirmed', 'checked_in'].includes(r.status)) throw new ApiError(400, `A ${r.status.replace('_', ' ')} booking cannot be moved`);
  const target = await Room.findById(req.body.room);
  if (!target) throw new ApiError(404, 'Room not found');
  if (String(target.branch) !== String(r.branch)) throw new ApiError(400, 'Room is in another hotel');
  if (target.isOutOfOrder || target.status === 'maintenance') throw new ApiError(400, `Room ${target.number} is out of service`);
  if (String(target._id) === String(r.room?._id)) return ok(res, r, 'Same room');
  const clash = await Reservation.exists({ _id: { $ne: r._id }, room: target._id, status: { $in: ACTIVE }, checkIn: { $lt: r.checkOut }, checkOut: { $gt: r.checkIn } });
  if (clash) throw new ApiError(409, `Room ${target.number} is already booked for these dates`);

  const from = r.room;
  r.room = target._id;
  if (String(target.roomType) !== String(r.roomType)) r.roomType = target.roomType; // upgrade / change type, price stays as booked
  await r.save();
  if (r.status === 'checked_in') {
    await Room.updateOne({ _id: from._id }, { status: 'available', condition: 'dirty' });
    await Room.updateOne({ _id: target._id }, { status: 'occupied' });
  }
  await audit(req, 'update', 'Reservation', r._id, { room: from?.number }, { room: target.number });
  emit('booking:new', { id: r._id, code: r.code });
  emit('room:status', { room: target._id, number: target.number });
  ok(res, r, `${r.code} moved to room ${target.number}`);
}

// ===================== Night audit =====================
export async function runAudit(req, res) {
  const results = await runNightAudit({ userId: req.user._id });
  await audit(req, 'create', 'NightAudit', results[0]?._id, null, { hotels: results.length });
  ok(res, results, `Night audit done for ${results.length} hotel(s)`);
}

export async function listAudits(req, res) {
  const filter = req.user.role === 'manager' && req.user.branch ? { branch: req.user.branch } : {};
  ok(res, await NightAudit.find(filter).populate('branch', 'name city').populate('runBy', 'name').sort('-date').limit(60));
}

export async function auditPdf(req, res) {
  const a = await NightAudit.findById(req.params.id).populate('branch', 'name city address').populate('runBy', 'name');
  if (!a) throw new ApiError(404, 'Report not found');
  const settings = (await Setting.findOne({ branch: null })) || {};
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="night-audit-${ymd(a.date)}-${a.branch.city}.pdf"`);
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  doc.pipe(res);
  const NAVY = '#141B2D', GOLD = '#C9A24D', INK = '#1B2236', MUTED = '#6B6455';
  const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
  doc.rect(0, 0, 595, 110).fill(NAVY).rect(0, 110, 595, 4).fill(GOLD);
  doc.fillColor('#FFFFFF').font('Times-Bold').fontSize(28).text('LuxuryStay', 48, 32);
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(16).text('NIGHT AUDIT REPORT', 300, 36, { width: 247, align: 'right' });
  doc.fillColor('#C7CBD8').font('Helvetica').fontSize(9).text(`${a.branch.name}\n${new Date(a.date).toDateString()}\n${settings.company?.name || ''}`, 300, 60, { width: 247, align: 'right' });
  const rows = [
    ['Rooms available', a.totalRooms], ['Rooms occupied', a.occupiedRooms], ['Occupancy', `${a.occupancy}%`],
    ['Revenue collected today', money(a.revenue)], ['ADR (average daily rate)', money(a.adr)], ['RevPAR', money(a.revpar)],
    ['Arrivals', a.arrivals], ['Departures', a.departures], ['No-shows', `${a.noShows}${a.noShowCodes?.length ? ` (${a.noShowCodes.join(', ')})` : ''}`],
    ['Cash', money(a.cashTotal)], ['Card at desk', money(a.cardTotal)], ['Online (Stripe)', money(a.onlineTotal)],
    ['Open balances of in-house guests', money(a.openBalances)],
  ];
  let y = 140;
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) doc.rect(48, y - 6, 499, 26).fill('#FBF8F1');
    doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(k, 60, y);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(String(v), 300, y, { width: 235, align: 'right' });
    y += 26;
  });
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`${a.auto ? 'Generated automatically at 23:55' : `Run by ${a.runBy?.name || 'staff'}`} · ${new Date(a.updatedAt).toLocaleString('en-GB')}`, 48, 780, { width: 499, align: 'center' });
  doc.end();
}

// ===================== Live activity feed (latest actions) =====================
export async function activity(req, res) {
  ok(res, await AuditLog.find().populate('user', 'name role').sort('-at').limit(15));
}

// ===================== Concierge assistant (answers from live hotel data) =====================
const has = (t, words) => words.some((w) => t.includes(w));
export async function concierge(req, res) {
  const text = String(req.body.message || '').toLowerCase().slice(0, 300);
  if (!text.trim()) throw new ApiError(400, 'Type a question');
  const reply = (answer, suggestions = [], link) => ok(res, { answer, suggestions, link });

  if (has(text, ['hello', 'hi ', 'salam', 'assalam', 'hey'])) return reply('Assalam o Alaikum and welcome to LuxuryStay! I can help with rooms, prices, availability, check-in times, dining, spa and bookings.', ['Room prices', 'Is a room free this weekend?', 'Check-in time']);

  const branches = await Branch.find({ isActive: true });
  const city = branches.find((b) => text.includes(b.city.toLowerCase()));

  if (has(text, ['free', 'available', 'availability', 'khali', 'weekend', 'tomorrow', 'kal'])) {
    const branch = city || branches[0];
    let checkIn = addDays(today(), 1);
    if (has(text, ['weekend'])) { const d = today(); checkIn = addDays(d, (5 - d.getUTCDay() + 7) % 7 || 7); }
    const m = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) checkIn = toDay(m[1]);
    const checkOut = addDays(checkIn, has(text, ['weekend']) ? 2 : 1);
    const types = await RoomType.find({ branch: branch._id, isActive: true }).sort('basePrice');
    const lines = [];
    for (const t of types) {
      const total = await Room.countDocuments({ roomType: t._id, isOutOfOrder: false });
      const busy = await Reservation.countDocuments({ roomType: t._id, status: { $in: ACTIVE }, checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } });
      lines.push(`${t.name}: ${Math.max(0, total - busy)} free`);
    }
    return reply(`For ${branch.city}, ${checkIn.toDateString()} → ${checkOut.toDateString()}: ${lines.join(' · ')}.`, ['Room prices', 'How do I book?'],
      `/search?branch=${branch._id}&checkIn=${ymd(checkIn)}&checkOut=${ymd(checkOut)}&adults=2`);
  }
  if (has(text, ['price', 'rate', 'cost', 'kitne', 'kiraya', 'kitna', 'rent', 'cheap', 'room'])) {
    const filter = { isActive: true, ...(city ? { branch: city._id } : {}) };
    const types = await RoomType.find(filter).populate('branch', 'city').sort('basePrice').limit(8);
    const uniq = Object.values(types.reduce((a, t) => ({ ...a, [t.name]: a[t.name] || t }), {}));
    return reply(`Our rooms${city ? ` in ${city.city}` : ''} start from: ${uniq.map((t) => `${t.name} PKR ${t.basePrice.toLocaleString()}`).join(' · ')} per night (plus tax). Weekend nights cost a little more.`, ['Is a room free this weekend?', 'Show me suites'], '/rooms');
  }
  if (has(text, ['check-in', 'checkin', 'check in', 'check-out', 'checkout', 'time', 'waqt'])) return reply('Check-in is from 2:00 PM and check-out is until 12:00 noon. Late checkout can be requested from your guest dashboard (PKR 5,000).', ['Cancellation policy']);
  if (has(text, ['cancel', 'refund'])) {
    const s = (await Setting.findOne({ branch: null })) || {};
    return reply(`Cancellation is free up to ${s.cancellationPolicy?.freeHours ?? 48} hours before check-in. After that, a ${s.cancellationPolicy?.feePercent ?? 20}% fee applies. Cancel from My bookings.`, ['How do I book?'], '/guest/bookings');
  }
  if (has(text, ['food', 'restaurant', 'dinner', 'breakfast', 'khana', 'dining'])) return reply('We have The Saffron Room (Mughlai), Azure Rooftop (grills) and Café Ivory (all day). In-room dining is 24 hours from your dashboard.', ['Spa', 'Room prices'], '/dining');
  if (has(text, ['spa', 'pool', 'gym', 'massage'])) return reply('Rooftop pool 6 AM–10 PM, 24-hour gym, steam and sauna, and our signature 90-minute massage.', ['Room prices'], '/wellness');
  if (has(text, ['pay', 'card', 'stripe', 'payment'])) return reply('You can pay securely online by card (Stripe) from your booking or dashboard, or pay at the front desk by cash or card.', ['How do I book?']);
  if (has(text, ['book', 'reserve', 'booking'])) return reply('Pick your hotel and dates in the booking bar, choose a room and confirm. You can pay online right away and get your QR key on check-in.', ['Room prices', 'Is a room free this weekend?'], '/rooms');
  if (has(text, ['promo', 'discount', 'offer', 'coupon'])) {
    const promos = await PromoCode.find({ isActive: true, $expr: { $lt: ['$used', '$maxUses'] } }).limit(3);
    return reply(promos.length ? `Current codes: ${promos.map((p) => `${p.code} (${p.percent}% off${p.minNights > 1 ? `, ${p.minNights}+ nights` : ''})`).join(' · ')}. Enter it when you book.` : 'No public codes right now, but members earn points on every stay.', ['Room prices'], '/offers');
  }
  if (has(text, ['contact', 'phone', 'email', 'address', 'location', 'where'])) return reply(branches.map((b) => `${b.name}: ${b.address}, ${b.phone}`).join(' · '), [], '/contact');
  if (has(text, ['3d', 'ar', '360', 'tour', 'view'])) return reply('Open any room and choose “360° view” or “3D tour and AR”. On a phone, tap “View in your room” to place it around you.', [], '/rooms');
  if (has(text, ['wifi', 'parking', 'pet', 'smoking'])) return reply('Free high-speed Wi-Fi and free valet parking for guests. Rooms are non-smoking and we welcome small pets on request.', []);
  return reply("I'm not sure about that one. You can ask about room prices, availability, check-in, cancellation, dining, spa or offers — or contact our team.", ['Room prices', 'Is a room free this weekend?', 'Contact'], '/contact');
}
