// Run: npm run seed   (WARNING: deletes old data and adds fresh demo data)
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { connectDB } from '../config/db.js';
import {
  User, GuestProfile, Branch, RoomType, Room, Setting, Counter,
  Reservation, Folio, Payment, Invoice, ServiceRequest, HousekeepingTask,
  MaintenanceRequest, Feedback, Notification, AuditLog, DailyRate, ContactMessage, PromoCode, NightAudit, LoginEvent,
} from '../models/index.js';

const branchesData = [
  { name: 'LuxuryStay Karachi', city: 'Karachi', address: 'Clifton Block 5, Karachi', phone: '+92 21 0000000', email: 'karachi@luxurystay.pk' },
  { name: 'LuxuryStay Lahore', city: 'Lahore', address: 'Gulberg III, Lahore', phone: '+92 42 0000000', email: 'lahore@luxurystay.pk' },
  { name: 'LuxuryStay Islamabad', city: 'Islamabad', address: 'Blue Area, Islamabad', phone: '+92 51 0000000', email: 'islamabad@luxurystay.pk' },
];

const typesData = [
  { name: 'Standard Room', slug: 'standard', basePrice: 15000, capacity: { adults: 2, children: 1 }, bedType: 'Queen', sizeSqm: 28, amenities: ['Wi-Fi', 'AC', 'TV', 'Mini bar'], rooms: 6 },
  { name: 'Deluxe King', slug: 'deluxe', basePrice: 25000, capacity: { adults: 2, children: 1 }, bedType: 'King', sizeSqm: 38, amenities: ['Wi-Fi', 'AC', 'Smart TV', 'Mini bar', 'City view', 'Bathtub'], rooms: 6 },
  { name: 'Executive Suite', slug: 'executive', basePrice: 45000, capacity: { adults: 3, children: 2 }, bedType: 'King', sizeSqm: 62, amenities: ['Wi-Fi', 'Lounge', 'Club access', 'Smart TV', 'Espresso machine'], rooms: 4 },
  { name: 'Presidential Suite', slug: 'presidential', basePrice: 90000, capacity: { adults: 4, children: 2 }, bedType: 'King', sizeSqm: 120, amenities: ['Butler', 'Private terrace', 'Jacuzzi', 'Dining room'], rooms: 2 },
];

const PASSWORD = 'Password@123';

// If you put real photos in client/public/images/real/ (e.g. deluxe-1.jpg, deluxe-360.jpg), seed uses them.
const REAL_DIR = path.resolve('../client/public/images/real');
function realPhoto(name) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    if (fs.existsSync(path.join(REAL_DIR, `${name}.${ext}`))) return `/images/real/${name}.${ext}`;
  }
  return null;
}
function photosFor(slug) {
  const real = [1, 2, 3, 4, 5, 6].map((n) => realPhoto(`${slug}-${n}`)).filter(Boolean);
  return real.length ? real : [1, 2, 3].map((n) => `/images/rooms/${slug}-${n}.jpg`);
}

const DESCRIPTIONS = {
  standard: 'A calm, well-designed room in {city} with a queen bed, work desk and rain shower. Perfect for short business trips.',
  deluxe: 'Our most loved room in {city}: a king bed, floor-to-ceiling windows, deep bathtub and a lounge chair to watch the city lights.',
  executive: 'A separate living room, king bedroom and Club Lounge access with breakfast and evening drinks. Made for longer stays in {city}.',
  presidential: 'The finest address in {city}: private terrace, dining room for six, jacuzzi and a personal butler on call 24/7.',
};

const DAY = 86400000;
const utcToday = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const oid = () => new mongoose.Types.ObjectId();

const firstNames = ['Ahmed', 'Fatima', 'Bilal', 'Zara', 'Usman', 'Hira', 'Hamza', 'Sana', 'Omar', 'Mariam', 'Daniel', 'Sarah', 'Imran', 'Ayesha', 'Faisal', 'Noor', 'Kamran', 'Amna', 'Yasir', 'Laila'];
const lastNames = ['Siddiqui', 'Qureshi', 'Sheikh', 'Butt', 'Malik', 'Chaudhry', 'Ross', 'Hussain', 'Iqbal', 'Mirza'];
const comments = ['Beautiful room and very helpful staff.', 'Great breakfast, will come again!', 'Clean, quiet and comfortable stay.', 'Check-in was quick and smooth.', 'Loved the city view from the room.', 'Room service was a bit slow but food was great.', 'Excellent value for money.'];

// Creates ~2 months of past bookings + current guests + upcoming bookings for the first branch,
// so the dashboard, reports, forecast and tape chart have real-looking data.
async function seedHistory(branch, mainGuest) {
  const guests = [mainGuest];
  for (let i = 0; i < 30; i++) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const g = await User.create({ name, email: `guest${i + 1}@example.com`, password: PASSWORD, role: 'guest' });
    await GuestProfile.create({ user: g._id, consent: { privacyAcceptedAt: new Date() }, loyalty: { points: rand(0, 3000) } });
    guests.push(g);
  }

  const rooms = await Room.find({ branch: branch._id }).populate('roomType');
  const t = utcToday();
  const res = [], folios = [], payments = [], invoices = [], feedback = [];
  let n = 0, inv = 0;
  let mainGuestHasStay = false;

  for (const room of rooms) {
    let cursor = new Date(t.getTime() - rand(55, 62) * DAY);
    while (cursor < new Date(t.getTime() + 14 * DAY)) {
      cursor = new Date(cursor.getTime() + rand(0, 3) * DAY);
      const nights = rand(1, 4);
      const checkIn = cursor;
      const checkOut = new Date(checkIn.getTime() + nights * DAY);
      cursor = checkOut;
      if (checkIn >= new Date(t.getTime() + 14 * DAY)) break;

      let status = 'confirmed';
      if (checkOut <= t) status = 'checked_out';
      else if (checkIn <= t) status = 'checked_in';
      let guestUser = pick(guests.slice(1));
      if (!mainGuestHasStay && status === 'checked_in' && room.roomType.slug === 'deluxe') { guestUser = mainGuest; mainGuestHasStay = true; }

      const rate = room.roomType.basePrice;
      const total = rate * nights;
      const rid = oid(), fid = oid();
      n += 1;
      res.push({
        _id: rid, code: `LS-${t.getUTCFullYear()}-${String(n).padStart(4, '0')}`, guest: guestUser._id, branch: branch._id,
        roomType: room.roomType._id, room: room._id, checkIn, checkOut, nights, adults: rand(1, 2), children: 0,
        status, source: pick(['online', 'online', 'walk_in', 'phone']), ratePerNight: rate, totalAmount: total,
        checkedInAt: status !== 'confirmed' ? checkIn : undefined, checkedOutAt: status === 'checked_out' ? checkOut : undefined,
        qrKeyToken: status === 'checked_in' ? Math.random().toString(16).slice(2) : undefined,
        createdAt: new Date(checkIn.getTime() - rand(1, 20) * DAY), updatedAt: new Date(),
      });

      const items = [{ _id: oid(), type: 'room', description: `${room.roomType.name} × ${nights} night(s)`, qty: nights, unitPrice: rate, amount: total, date: checkIn }];
      if (status !== 'confirmed' && Math.random() < 0.5) items.push({ _id: oid(), type: 'food', description: 'Room service', qty: 1, unitPrice: rand(2, 8) * 500, amount: 0, date: checkIn });
      items.forEach((i) => (i.amount = i.qty * i.unitPrice));
      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      const tax = Math.round(subtotal * 0.16);
      const grand = subtotal + tax;
      const paid = status === 'checked_out' ? grand : status === 'checked_in' ? Math.round(grand / 2) : 0;
      folios.push({ _id: fid, reservation: rid, guest: guestUser._id, items, subtotal, discount: 0, taxRate: 16, taxAmount: tax, total: grand, paid, balance: grand - paid, status: status === 'checked_out' ? 'closed' : 'open', createdAt: checkIn, updatedAt: new Date() });
      if (paid) {
        const when = status === 'checked_out' ? new Date(checkOut.getTime() + 10 * 3600000) : new Date(checkIn.getTime() + 15 * 3600000);
        payments.push({ _id: oid(), folio: fid, reservation: rid, amount: paid, method: pick(['cash', 'card', 'card']), status: 'succeeded', createdAt: when, updatedAt: when });
      }
      if (status === 'checked_out') {
        inv += 1;
        invoices.push({ _id: oid(), number: `INV-${t.getUTCFullYear()}-${String(inv).padStart(4, '0')}`, folio: fid, guest: guestUser._id, reservation: rid, branch: branch._id, kind: 'final', issuedAt: checkOut, createdAt: checkOut, updatedAt: checkOut });
        if (Math.random() < 0.45) feedback.push({ _id: oid(), reservation: rid, guest: guestUser._id, branch: branch._id, rating: pick([5, 5, 5, 4, 4, 4, 3]), comment: pick(comments), isPublic: true, createdAt: checkOut, updatedAt: checkOut });
      }
    }
    // Room status for today
    const now = res.filter((r) => r.room.equals(room._id));
    const occupied = now.some((r) => r.status === 'checked_in');
    const arriving = now.some((r) => r.status === 'confirmed' && r.checkIn.getTime() === t.getTime());
    await Room.updateOne({ _id: room._id }, { status: occupied ? 'occupied' : arriving ? 'reserved' : 'available', condition: Math.random() < 0.2 ? 'dirty' : 'clean' });
  }

  await Reservation.collection.insertMany(res);
  await Folio.collection.insertMany(folios);
  if (payments.length) await Payment.collection.insertMany(payments);
  if (invoices.length) await Invoice.collection.insertMany(invoices);
  if (feedback.length) await Feedback.collection.insertMany(feedback);
  await Counter.create([{ key: `LS-${t.getUTCFullYear()}`, seq: n }, { key: `INV-${t.getUTCFullYear()}`, seq: inv }]);

  const hk = await User.findOne({ role: 'housekeeping' });
  const dirty = await Room.find({ branch: branch._id, condition: 'dirty' }).limit(6);
  for (const r of dirty) await HousekeepingTask.create({ room: r._id, branch: branch._id, type: 'checkout_clean', priority: 'high', assignedTo: hk._id, dueAt: new Date(Date.now() + 3 * 3600000) });
  const someRoom = rooms[3];
  await MaintenanceRequest.create({ room: someRoom._id, reportedBy: hk._id, title: 'AC not cooling', category: 'ac', priority: 'high', description: 'Guest reported weak cooling' });
  await Room.updateOne({ _id: rooms[rooms.length - 1]._id, status: 'available' }, { status: 'maintenance' });

  console.log(`${res.length} bookings, ${payments.length} payments, ${invoices.length} invoices, ${feedback.length} reviews added`);
}

async function run() {
  await connectDB();
  console.log('Clearing old data...');
  const all = [User, GuestProfile, Branch, RoomType, Room, Setting, Counter, Reservation, Folio, Payment,
    Invoice, ServiceRequest, HousekeepingTask, MaintenanceRequest, Feedback, Notification, AuditLog, DailyRate, ContactMessage, PromoCode, NightAudit, LoginEvent];
  for (const m of all) await m.deleteMany({});

  await Setting.create({ branch: null, taxRate: 16, currency: 'PKR' });

  const branches = await Branch.insertMany(branchesData);
  console.log(`${branches.length} branches added`);

  let roomCount = 0;
  for (const branch of branches) {
    for (const t of typesData) {
      const { rooms, ...typeFields } = t;
      const type = await RoomType.create({
        ...typeFields,
        branch: branch._id,
        description: DESCRIPTIONS[t.slug].replace('{city}', branch.city),
        view: t.slug === 'standard' ? 'Garden view' : 'City view',
        images: photosFor(t.slug).map((url) => ({ url })),
        model3dUrl: `/models/${t.slug}.glb`,
        panoramaUrl: realPhoto(`${t.slug}-360`) || `/images/360/${t.slug}.jpg`,
      });
      const floor = { standard: 1, deluxe: 2, executive: 3, presidential: 4 }[t.slug];
      const docs = Array.from({ length: rooms }, (_, i) => ({
        branch: branch._id,
        roomType: type._id,
        number: `${floor}${String(i + 1).padStart(2, '0')}`,
        floor,
      }));
      await Room.insertMany(docs);
      roomCount += docs.length;
    }
  }
  console.log(`${roomCount} rooms added`);
  console.log(fs.existsSync(REAL_DIR) ? `Real photos folder found: ${fs.readdirSync(REAL_DIR).length} file(s)` : 'No real photos yet (using built-in images)');

  const khi = branches[0]._id;
  const staff = [
    { name: 'Saad Younus', email: 'admin@luxurystay.pk', role: 'admin' },
    { name: 'Hina Malik', email: 'manager@luxurystay.pk', role: 'manager', branch: khi },
    { name: 'Ali Raza', email: 'reception@luxurystay.pk', role: 'receptionist', branch: khi },
    { name: 'Nadia Khan', email: 'housekeeping@luxurystay.pk', role: 'housekeeping', branch: khi },
  ];
  for (const s of staff) await User.create({ ...s, password: PASSWORD });

  const guest = await User.create({ name: 'Ayesha Khan', email: 'guest@luxurystay.pk', password: PASSWORD, role: 'guest', phone: '+92 300 0000000' });
  await GuestProfile.create({ user: guest._id, consent: { privacyAcceptedAt: new Date() }, loyalty: { points: 2450, tier: 'gold' } });

  await seedHistory(branches[0], guest);
  await PromoCode.create([
    { code: 'WELCOME10', description: '10% off your first stay', percent: 10, maxUses: 500 },
    { code: 'STAY3', description: '15% off stays of 3 nights or more', percent: 15, minNights: 3, maxUses: 200 },
    { code: 'APTECH20', description: 'Aptech demo: 20% off', percent: 20, maxUses: 50 },
  ]);
  await ContactMessage.create([
    { name: 'Bilal Ahmed', email: 'bilal@example.com', subject: 'Wedding booking', message: 'Do you have a hall for 300 guests in December?', branch: branches[0]._id },
    { name: 'Sarah Ross', email: 'sarah@example.com', subject: 'Airport pickup', message: 'Can you arrange a pickup from Karachi airport at 2 AM?' },
  ]);

  console.log('\nDemo logins (password for all: ' + PASSWORD + ')');
  [...staff, { email: 'guest@luxurystay.pk', role: 'guest' }].forEach((u) => console.log(`  ${u.role.padEnd(13)} ${u.email}`));

  await mongoose.disconnect();
  console.log('\nSeed complete');
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
