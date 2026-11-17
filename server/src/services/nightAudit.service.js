import cron from 'node-cron';
import { Branch, Room, Reservation, Payment, Folio, NightAudit } from '../models/index.js';
import { today, addDays } from '../utils/dates.js';
import { logger } from '../config/logger.js';
import { notify } from './notify.service.js';

// End-of-day close: marks no-shows and saves the day's numbers for each hotel.
export async function runNightAudit({ userId, auto = false } = {}) {
  const day = today();
  const next = addDays(day, 1);
  const branches = await Branch.find({ isActive: true });
  const results = [];

  for (const b of branches) {
    // Guests who never arrived (check-in date already passed) become no-shows, and their room is freed
    const late = await Reservation.find({ branch: b._id, status: 'confirmed', checkIn: { $lt: day } });
    for (const r of late) {
      r.status = 'no_show';
      await r.save();
      await Room.updateOne({ _id: r.room, status: 'reserved' }, { status: 'available' });
    }

    const [totalRooms, occupiedRooms, arrivals, departures, branchRes] = await Promise.all([
      Room.countDocuments({ branch: b._id, isOutOfOrder: false }),
      Reservation.countDocuments({ branch: b._id, status: { $in: ['checked_in', 'checked_out'] }, checkIn: { $lte: day }, checkOut: { $gt: day } }),
      Reservation.countDocuments({ branch: b._id, checkIn: day, status: { $in: ['checked_in', 'checked_out'] } }),
      Reservation.countDocuments({ branch: b._id, checkOut: day, status: 'checked_out' }),
      Reservation.find({ branch: b._id }).select('_id status'),
    ]);
    const ids = branchRes.map((r) => r._id);
    const payments = await Payment.find({ reservation: { $in: ids }, status: 'succeeded', createdAt: { $gte: day, $lt: next } });
    const sum = (m) => payments.filter((p) => !m || m.includes(p.method)).reduce((s, p) => s + p.amount, 0);
    const inHouse = branchRes.filter((r) => r.status === 'checked_in').map((r) => r._id);
    const openFolios = await Folio.find({ reservation: { $in: inHouse } }).select('balance');
    const revenue = sum();

    const doc = await NightAudit.findOneAndUpdate(
      { branch: b._id, date: day },
      {
        totalRooms, occupiedRooms, occupancy: totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
        revenue, adr: occupiedRooms ? Math.round(revenue / occupiedRooms) : 0, revpar: totalRooms ? Math.round(revenue / totalRooms) : 0,
        arrivals, departures, noShows: late.length, noShowCodes: late.map((r) => r.code),
        openBalances: openFolios.reduce((s, f) => s + Math.max(0, f.balance), 0),
        cashTotal: sum(['cash']), cardTotal: sum(['card']), onlineTotal: sum(['stripe', 'online']),
        runBy: userId, auto,
      },
      { new: true, upsert: true }
    );
    results.push(doc);
  }
  await notify({ role: 'manager', title: 'Night audit complete', message: `${results.length} hotel(s) closed for ${day.toDateString()}`, link: '/staff/night-audit', type: 'report' });
  return results;
}

// Runs every night at 23:55 (server time)
export function scheduleNightAudit() {
  cron.schedule('55 23 * * *', () => {
    runNightAudit({ auto: true })
      .then((r) => logger.info(`Night audit done for ${r.length} hotel(s)`))
      .catch((err) => logger.error(`Night audit failed: ${err.message}`));
  });
}
