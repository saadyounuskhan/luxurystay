// Tools the AI may call. Each tool returns only what that role is allowed to see.
// Never return passwords, card data, ID numbers, or another guest's details to a guest.
import { Branch, RoomType, Room, Reservation, Folio, ServiceRequest, PromoCode, Setting, Feedback, HousekeepingTask, MaintenanceRequest, Payment, User } from '../models/index.js';
import { today, addDays, toDay, ymd, nightsBetween } from '../utils/dates.js';
import { ACTIVE, priceFor } from './booking.service.js';

const STAFF = ['admin', 'manager', 'receptionist', 'housekeeping'];
const DESK = ['admin', 'manager', 'receptionist'];
const MGMT = ['admin', 'manager'];
const str = (description) => ({ type: 'string', description });
const num = (description) => ({ type: 'number', description });

async function branchFor(city) {
  if (!city) return null;
  return Branch.findOne({ city: new RegExp(`^${String(city).replace(/[^a-z\s]/gi, '')}`, 'i'), isActive: true });
}
const scopeOf = (user) => (user?.role === 'admin' || !user?.branch ? {} : { branch: user.branch });

export const TOOLS = [
  // ---------------- Everyone (website visitors too) ----------------
  {
    roles: null,
    name: 'list_hotels_and_rooms',
    description: 'List LuxuryStay hotels and their room types with base price per night, size, beds, max guests and amenities. Use for any question about rooms or prices.',
    parameters: { type: 'object', properties: { city: str('Optional city: Karachi, Lahore or Islamabad') } },
    async run({ city }) {
      const b = await branchFor(city);
      const types = await RoomType.find({ isActive: true, ...(b ? { branch: b._id } : {}) }).populate('branch', 'name city').sort('basePrice');
      return types.map((t) => ({ id: String(t._id), hotel: t.branch?.name, city: t.branch?.city, room: t.name, pricePerNightPKR: t.basePrice, sizeSqm: t.sizeSqm, bed: t.bedType, maxAdults: t.capacity?.adults, amenities: t.amenities, link: `/rooms/${t._id}` }));
    },
  },
  {
    roles: null,
    name: 'check_availability',
    description: 'Check which room types are free in a city for given dates, with the total price. Dates must be YYYY-MM-DD.',
    parameters: { type: 'object', properties: { city: str('Karachi, Lahore or Islamabad'), check_in: str('YYYY-MM-DD'), check_out: str('YYYY-MM-DD'), adults: num('Number of adults') }, required: ['city', 'check_in', 'check_out'] },
    async run({ city, check_in, check_out, adults = 1 }) {
      const b = await branchFor(city);
      if (!b) return { error: 'Unknown city. We have hotels in Karachi, Lahore and Islamabad.' };
      const checkIn = toDay(check_in), checkOut = toDay(check_out);
      const nights = nightsBetween(checkIn, checkOut);
      if (isNaN(nights) || nights < 1) return { error: 'Check-out must be after check-in' };
      if (checkIn < today()) return { error: 'Check-in date is in the past' };
      const types = await RoomType.find({ branch: b._id, isActive: true, 'capacity.adults': { $gte: adults } }).sort('basePrice');
      const out = [];
      for (const t of types) {
        const total = await Room.countDocuments({ roomType: t._id, isOutOfOrder: false });
        const busy = await Reservation.countDocuments({ roomType: t._id, status: { $in: ACTIVE }, checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } });
        const p = await priceFor(t, checkIn, nights);
        out.push({ room: t.name, freeRooms: Math.max(0, total - busy), nights, totalPKR: p.total, taxPercent: p.taxRate });
      }
      return { hotel: b.name, checkIn: check_in, checkOut: check_out, rooms: out, bookLink: `/search?branch=${b._id}&checkIn=${check_in}&checkOut=${check_out}&adults=${adults}` };
    },
  },
  {
    roles: null,
    name: 'hotel_policies_and_services',
    description: 'Hotel facts: check-in/out times, cancellation policy, tax, dining, spa, pool, gym, Wi-Fi, parking, payments, digital key, addresses and phone numbers, and active promo codes.',
    parameters: { type: 'object', properties: {} },
    async run() {
      const s = (await Setting.findOne({ branch: null })) || {};
      const branches = await Branch.find({ isActive: true });
      const promos = await PromoCode.find({ isActive: true, $expr: { $lt: ['$used', '$maxUses'] } }).limit(5);
      return {
        checkIn: '14:00', checkOut: '12:00', lateCheckoutPKR: 5000,
        cancellation: `Free until ${s.cancellationPolicy?.freeHours ?? 48} hours before check-in, then ${s.cancellationPolicy?.feePercent ?? 20}% fee`,
        taxPercent: s.taxRate ?? 16,
        dining: ['The Saffron Room (Mughlai, 7 PM–midnight)', 'Azure Rooftop (grills, 5 PM–1 AM)', 'Café Ivory (all day)', 'In-room dining 24 hours from the guest dashboard'],
        wellness: ['Rooftop pool 6 AM–10 PM', '24-hour gym', 'Steam and sauna', 'Signature 90-minute massage'],
        extras: ['Free Wi-Fi', 'Free valet parking', 'Airport transfer PKR 3,500', 'Laundry PKR 1,500', 'QR digital room key after check-in', 'Pay online by card (Stripe) or at the desk'],
        hotels: branches.map((b) => ({ name: b.name, address: b.address, phone: b.phone, email: b.email })),
        promoCodes: promos.map((p) => ({ code: p.code, percentOff: p.percent, minNights: p.minNights, about: p.description })),
      };
    },
  },
  // ---------------- Logged-in guest: only their own data ----------------
  {
    roles: ['guest'],
    name: 'my_bookings',
    description: "The signed-in guest's own bookings with dates, room, status and bill balance.",
    parameters: { type: 'object', properties: {} },
    async run(_, user) {
      const list = await Reservation.find({ guest: user._id }).populate('roomType', 'name').populate('room', 'number').populate('branch', 'city').sort('-checkIn').limit(10);
      const folios = await Folio.find({ reservation: { $in: list.map((r) => r._id) } });
      return list.map((r) => {
        const f = folios.find((x) => String(x.reservation) === String(r._id));
        return { code: r.code, city: r.branch?.city, room: `${r.roomType?.name}${r.room ? ` #${r.room.number}` : ''}`, checkIn: ymd(r.checkIn), checkOut: ymd(r.checkOut), status: r.status, totalPKR: f?.total, paidPKR: f?.paid, balancePKR: f?.balance };
      });
    },
  },
  {
    roles: ['guest'],
    name: 'my_service_requests',
    description: "The signed-in guest's own service and maintenance requests and their status.",
    parameters: { type: 'object', properties: {} },
    async run(_, user) {
      const s = await ServiceRequest.find({ guest: user._id }).sort('-createdAt').limit(10);
      const m = await MaintenanceRequest.find({ reportedBy: user._id }).sort('-createdAt').limit(5);
      return { services: s.map((x) => ({ type: x.type, details: x.details, status: x.status, pricePKR: x.price })), issues: m.map((x) => ({ title: x.title, status: x.status })) };
    },
  },
  // ---------------- Staff ----------------
  {
    roles: STAFF,
    name: 'today_overview',
    description: "Today's hotel snapshot for staff: rooms by status, occupancy %, arrivals, departures, rooms needing cleaning, open repairs and open guest requests. Limited to the staff member's own hotel (admin sees all).",
    parameters: { type: 'object', properties: {} },
    async run(_, user) {
      const scope = scopeOf(user);
      const t = today();
      const rooms = await Room.find(scope).select('status condition');
      const count = (k, v) => rooms.filter((r) => r[k] === v).length;
      const [arrivals, departures, cleaning, repairs, requests] = await Promise.all([
        Reservation.countDocuments({ ...scope, status: 'confirmed', checkIn: { $lte: t } }),
        Reservation.countDocuments({ ...scope, status: 'checked_in', checkOut: { $lte: t } }),
        HousekeepingTask.countDocuments({ ...scope, status: { $in: ['pending', 'in_progress'] } }),
        MaintenanceRequest.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
        ServiceRequest.countDocuments({ status: { $in: ['requested', 'accepted', 'in_progress'] } }),
      ]);
      return { date: ymd(t), totalRooms: rooms.length, occupied: count('status', 'occupied'), available: count('status', 'available'), reserved: count('status', 'reserved'), maintenance: count('status', 'maintenance'), dirty: count('condition', 'dirty'), occupancyPercent: rooms.length ? Math.round((count('status', 'occupied') / rooms.length) * 100) : 0, arrivalsWaiting: arrivals, departuresDue: departures, cleaningTasksOpen: cleaning, repairsOpen: repairs, guestRequestsOpen: requests };
    },
  },
  {
    roles: DESK,
    name: 'find_booking',
    description: 'Look up a booking by its code (like LS-2026-0012) or by guest name. Front desk use.',
    parameters: { type: 'object', properties: { query: str('Booking code or part of guest name') }, required: ['query'] },
    async run({ query }, user) {
      const q = String(query).trim();
      const filter = { ...scopeOf(user) };
      if (/^LS-/i.test(q)) filter.code = q.toUpperCase();
      else {
        const guests = await User.find({ role: 'guest', name: new RegExp(q.replace(/[^\w\s]/g, ''), 'i') }).select('_id').limit(20);
        filter.guest = { $in: guests.map((g) => g._id) };
      }
      const list = await Reservation.find(filter).populate('guest', 'name phone').populate('roomType', 'name').populate('room', 'number').sort('-checkIn').limit(5);
      return list.map((r) => ({ code: r.code, guest: r.guest?.name, phone: r.guest?.phone, room: `${r.roomType?.name} #${r.room?.number || '-'}`, checkIn: ymd(r.checkIn), checkOut: ymd(r.checkOut), status: r.status, totalPKR: r.totalAmount }));
    },
  },
  {
    roles: DESK,
    name: 'arrivals_and_departures',
    description: "Names and rooms of today's arrivals (not yet checked in) and departures (due to check out).",
    parameters: { type: 'object', properties: {} },
    async run(_, user) {
      const scope = scopeOf(user), t = today();
      const pop = (q) => q.populate('guest', 'name').populate('room', 'number').select('code guest room checkIn checkOut');
      const [a, d] = await Promise.all([pop(Reservation.find({ ...scope, status: 'confirmed', checkIn: { $lte: t } })), pop(Reservation.find({ ...scope, status: 'checked_in', checkOut: { $lte: t } }))]);
      const fmt = (r) => ({ code: r.code, guest: r.guest?.name, room: r.room?.number });
      return { arrivals: a.map(fmt), departures: d.map(fmt) };
    },
  },
  {
    roles: MGMT,
    name: 'revenue_report',
    description: 'Revenue, ADR, RevPAR and occupancy for the last N days (default 7). Management only.',
    parameters: { type: 'object', properties: { days: num('Number of past days, 1 to 90') } },
    async run({ days = 7 }, user) {
      const n = Math.min(90, Math.max(1, Number(days) || 7));
      const scope = scopeOf(user), t = today(), from = addDays(t, -n + 1);
      const roomCount = await Room.countDocuments({ ...scope, isOutOfOrder: false });
      const res = await Reservation.find({ ...scope }).select('_id');
      const pays = await Payment.find({ reservation: { $in: res.map((r) => r._id) }, status: 'succeeded', createdAt: { $gte: from } });
      const stays = await Reservation.find({ ...scope, status: { $in: ['checked_in', 'checked_out', 'confirmed'] }, checkIn: { $lt: addDays(t, 1) }, checkOut: { $gt: from } }).select('checkIn checkOut');
      let sold = 0;
      for (let d = from; d <= t; d = addDays(d, 1)) sold += stays.filter((s) => s.checkIn <= d && s.checkOut > d).length;
      const revenue = pays.reduce((s, p) => s + p.amount, 0);
      const byMethod = pays.reduce((a, p) => ({ ...a, [p.method]: (a[p.method] || 0) + p.amount }), {});
      return { days: n, revenuePKR: revenue, byMethodPKR: byMethod, roomNightsSold: sold, occupancyPercent: roomCount ? Math.round((sold / (roomCount * n)) * 100) : 0, adrPKR: sold ? Math.round(revenue / sold) : 0, revparPKR: roomCount ? Math.round(revenue / (roomCount * n)) : 0 };
    },
  },
  {
    roles: MGMT,
    name: 'guest_feedback_summary',
    description: 'Average rating and the latest guest reviews. Management only.',
    parameters: { type: 'object', properties: {} },
    async run(_, user) {
      const list = await Feedback.find(scopeOf(user)).sort('-createdAt').limit(15);
      const avg = list.length ? Number((list.reduce((s, f) => s + f.rating, 0) / list.length).toFixed(1)) : null;
      return { averageRating: avg, latest: list.map((f) => ({ rating: f.rating, comment: f.comment, replied: !!f.reply?.text })) };
    },
  },
];

export const toolsFor = (user) => TOOLS.filter((t) => !t.roles || (user && t.roles.includes(user.role)));
