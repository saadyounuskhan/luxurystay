import { Room, Reservation, Payment, Feedback, RoomType, DailyRate, Setting, MaintenanceRequest, HousekeepingTask, ServiceRequest } from '../models/index.js';
import { ok } from '../utils/response.js';
import { branchFilter } from '../utils/scope.js';
import { today, addDays, ymd } from '../utils/dates.js';
import { ApiError } from '../utils/ApiError.js';

const ACTIVE = ['confirmed', 'checked_in', 'checked_out'];
const occupiedOn = (list, day) => list.filter((r) => r.checkIn <= day && r.checkOut > day).length;

// Main dashboard numbers. Occupancy % = rooms sold / rooms available. ADR = revenue / rooms sold. RevPAR = revenue / rooms available.
export async function kpis(req, res) {
  const scope = branchFilter(req);
  const t = today();
  const from = addDays(t, -29);
  const [roomCount, rooms, stays, payments, feedback, arrivals, departures, openTickets, dirtyTasks, openRequests] = await Promise.all([
    Room.countDocuments({ ...scope, isOutOfOrder: false }),
    Room.find(scope).select('status condition'),
    Reservation.find({ ...scope, status: { $in: ACTIVE }, checkIn: { $lt: addDays(t, 1) }, checkOut: { $gt: from } }).select('checkIn checkOut ratePerNight'),
    Payment.find({ status: 'succeeded', createdAt: { $gte: from } }).populate({ path: 'reservation', select: 'branch' }),
    Feedback.find({ ...scope, createdAt: { $gte: addDays(t, -90) } }).select('rating'),
    Reservation.countDocuments({ ...scope, status: 'confirmed', checkIn: t }),
    Reservation.countDocuments({ ...scope, status: 'checked_in', checkOut: { $lte: t } }),
    MaintenanceRequest.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    HousekeepingTask.countDocuments({ ...scope, status: { $in: ['pending', 'in_progress'] } }),
    ServiceRequest.countDocuments({ status: { $in: ['requested', 'accepted', 'in_progress'] } }),
  ]);

  const branchPayments = scope.branch ? payments.filter((p) => p.reservation?.branch?.toString() === scope.branch.toString()) : payments;
  const occupiedToday = occupiedOn(stays, t);
  const revenueToday = branchPayments.filter((p) => p.createdAt >= t).reduce((s, p) => s + p.amount, 0);

  // Last 30 days chart
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(t, -i);
    const next = addDays(d, 1);
    const sold = occupiedOn(stays, d);
    const revenue = branchPayments.filter((p) => p.createdAt >= d && p.createdAt < next).reduce((s, p) => s + p.amount, 0);
    days.push({ date: ymd(d), sold, occupancy: roomCount ? Math.round((sold / roomCount) * 100) : 0, revenue });
  }
  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const totalSold = days.reduce((s, d) => s + d.sold, 0);

  const statusCount = rooms.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  ok(res, {
    today: {
      occupancy: roomCount ? Math.round((occupiedToday / roomCount) * 100) : 0,
      occupiedRooms: occupiedToday, totalRooms: roomCount, revenue: revenueToday,
      arrivals, departures, openTickets, pendingCleaning: dirtyTasks, openRequests,
    },
    last30: {
      revenue: totalRevenue,
      adr: totalSold ? Math.round(totalRevenue / totalSold) : 0,
      revpar: roomCount ? Math.round(totalRevenue / (roomCount * 30)) : 0,
      avgOccupancy: Math.round(days.reduce((s, d) => s + d.occupancy, 0) / 30),
    },
    rating: feedback.length ? Number((feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)) : null,
    reviews: feedback.length,
    roomStatus: statusCount,
    daily: days,
  });
}

// Forecast next 14 days = rooms already booked + average extra bookings we usually get for that weekday (last 8 weeks)
export async function forecast(req, res) {
  const scope = branchFilter(req);
  const t = today();
  const roomCount = await Room.countDocuments({ ...scope, isOutOfOrder: false });
  const stays = await Reservation.find({ ...scope, status: { $in: ACTIVE }, checkOut: { $gt: addDays(t, -56) }, checkIn: { $lt: addDays(t, 15) } }).select('checkIn checkOut');

  const weekdayAvg = Array(7).fill(0);
  const weekdayN = Array(7).fill(0);
  for (let i = 1; i <= 56; i++) {
    const d = addDays(t, -i);
    weekdayAvg[d.getUTCDay()] += occupiedOn(stays, d);
    weekdayN[d.getUTCDay()] += 1;
  }
  const out = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(t, i);
    const booked = occupiedOn(stays, d);
    const typical = weekdayN[d.getUTCDay()] ? weekdayAvg[d.getUTCDay()] / weekdayN[d.getUTCDay()] : booked;
    const expected = Math.min(roomCount, Math.round(Math.max(booked, typical)));
    out.push({ date: ymd(d), booked, expected, occupancy: roomCount ? Math.round((expected / roomCount) * 100) : 0 });
  }
  ok(res, { totalRooms: roomCount, days: out });
}

// Rule-based price suggestions for next 7 days. Manager approves.
export async function pricingSuggestions(req, res) {
  const scope = branchFilter(req);
  const t = today();
  const s = (await Setting.findOne({ branch: null })) || {};
  const weekend = s.pricingRules?.weekendMultiplier || 1.15;
  const types = await RoomType.find({ ...scope, isActive: true });
  const out = [];
  for (const type of types) {
    const total = await Room.countDocuments({ roomType: type._id, isOutOfOrder: false });
    const stays = await Reservation.find({ roomType: type._id, status: { $in: ['confirmed', 'checked_in'] }, checkIn: { $lt: addDays(t, 8) }, checkOut: { $gt: t } }).select('checkIn checkOut');
    for (let i = 1; i <= 7; i++) {
      const d = addDays(t, i);
      const occ = total ? occupiedOn(stays, d) / total : 0;
      let factor = occ >= 0.8 ? 1.2 : occ >= 0.6 ? 1.1 : occ <= 0.3 ? 0.9 : 1;
      if ([5, 6].includes(d.getUTCDay())) factor *= weekend;
      const suggested = Math.round((type.basePrice * factor) / 500) * 500;
      if (suggested === type.basePrice) continue;
      const existing = await DailyRate.findOne({ roomType: type._id, date: d });
      out.push({
        roomType: { _id: type._id, name: type.name }, date: ymd(d), basePrice: type.basePrice, suggested,
        occupancy: Math.round(occ * 100),
        reason: `${Math.round(occ * 100)}% booked${[5, 6].includes(d.getUTCDay()) ? ', weekend' : ''}`,
        approvedPrice: existing?.approvedPrice || null,
      });
    }
  }
  ok(res, out);
}

export async function approvePrice(req, res) {
  const { roomType, date, price } = req.body;
  if (!roomType || !date || !price) throw new ApiError(400, 'roomType, date and price are required');
  const rate = await DailyRate.findOneAndUpdate(
    { roomType, date: new Date(date) },
    { approvedPrice: price, suggestedPrice: price, approvedBy: req.user._id, reason: 'Manager approved' },
    { new: true, upsert: true }
  );
  ok(res, rate, 'Price approved');
}

// CSV export of bookings for the reports page
export async function exportBookings(req, res) {
  const list = await Reservation.find(branchFilter(req)).populate('guest', 'name email').populate('roomType', 'name').populate('room', 'number').sort('-checkIn').limit(2000);
  const rows = [['Code', 'Guest', 'Email', 'Room type', 'Room', 'Check-in', 'Check-out', 'Nights', 'Status', 'Total PKR']];
  list.forEach((r) => rows.push([r.code, r.guest?.name, r.guest?.email, r.roomType?.name, r.room?.number, ymd(r.checkIn), ymd(r.checkOut), r.nights, r.status, r.totalAmount]));
  const csv = rows.map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"');
  res.send(csv);
}
