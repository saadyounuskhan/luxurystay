import PDFDocument from 'pdfkit';
import { Folio, Payment, Invoice, Reservation, Setting } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { audit } from '../middleware/audit.js';
import { notify } from '../services/notify.service.js';
import { nextCode } from '../utils/generateCode.js';
import { stripe, stripeEnabled, createCheckout, confirmSession, markSessionFailed } from '../services/stripe.service.js';
import { stripeEnv } from '../config/env.js';

const isGuest = (req) => req.user.role === 'guest';
const own = (req, guestId) => !isGuest(req) || String(guestId?._id || guestId) === String(req.user._id);
// Receptionist and manager see their own branch. Admin sees all. Guest sees only own.
function canSee(req, reservation) {
  if (isGuest(req)) return String(reservation.guest?._id || reservation.guest) === String(req.user._id);
  if (req.user.role === 'admin' || !req.user.branch) return true;
  return String(reservation.branch?._id || reservation.branch) === String(req.user.branch);
}

// ================= Folio (the running bill) =================
export async function getFolio(req, res) {
  const r = await Reservation.findById(req.params.reservationId);
  if (!r) throw new ApiError(404, 'Booking not found');
  if (!canSee(req, r)) throw new ApiError(403, 'Not allowed');
  const folio = await Folio.findOne({ reservation: r._id });
  if (!folio) throw new ApiError(404, 'Bill not found');
  const [payments, invoice] = await Promise.all([
    Payment.find({ folio: folio._id, status: 'succeeded' }).sort('-createdAt'),
    Invoice.findOne({ folio: folio._id }).select('number kind'),
  ]);
  ok(res, { folio, payments, invoice });
}

export async function addItem(req, res) {
  const folio = await Folio.findOne({ reservation: req.params.reservationId });
  if (!folio) throw new ApiError(404, 'Bill not found');
  if (folio.status === 'closed') throw new ApiError(400, 'This bill is closed');
  folio.items.push(req.body);
  folio.recalculate();
  await folio.save();
  await audit(req, 'update', 'Folio', folio._id, null, { added: req.body });
  ok(res, folio, 'Charge added');
}

export async function removeItem(req, res) {
  const folio = await Folio.findOne({ reservation: req.params.reservationId });
  if (!folio || folio.status === 'closed') throw new ApiError(400, 'Bill not editable');
  const item = folio.items.id(req.params.itemId);
  if (!item || item.type === 'room') throw new ApiError(400, 'This charge cannot be removed');
  item.deleteOne();
  folio.recalculate();
  await folio.save();
  await audit(req, 'update', 'Folio', folio._id, null, { removed: item.description });
  ok(res, folio, 'Charge removed');
}

export async function setDiscount(req, res) {
  const folio = await Folio.findOne({ reservation: req.params.reservationId });
  if (!folio || folio.status === 'closed') throw new ApiError(400, 'Bill not editable');
  const discount = Math.max(0, Number(req.body.discount) || 0);
  if (discount > folio.subtotal) throw new ApiError(400, 'Discount is more than the bill');
  folio.discount = discount;
  folio.recalculate();
  await folio.save();
  await audit(req, 'update', 'Folio', folio._id, null, { discount });
  ok(res, folio, 'Discount applied');
}

// ================= Payments =================
export const paymentConfig = (req, res) => ok(res, { stripe: stripeEnabled(), currency: stripeEnv.currency.toUpperCase() });

// Staff: cash / card at the desk. Guest: demo card (only when Stripe is not set up).
export async function pay(req, res) {
  const r = await Reservation.findById(req.body.reservation);
  if (!r) throw new ApiError(404, 'Booking not found');
  if (!canSee(req, r)) throw new ApiError(403, 'Not your booking');
  if (isGuest(req) && stripeEnabled()) throw new ApiError(400, 'Please pay online with Stripe');
  const folio = await Folio.findOne({ reservation: r._id });
  folio.recalculate();
  if (folio.balance <= 0) throw new ApiError(400, 'Nothing to pay');
  const amount = Math.min(Number(req.body.amount), folio.balance);
  const method = isGuest(req) ? 'online' : req.body.method;

  const payment = await Payment.create({ folio: folio._id, reservation: r._id, amount, method, status: 'succeeded', receivedBy: req.user._id });
  folio.paid += amount;
  folio.recalculate();
  await folio.save();
  await audit(req, 'create', 'Payment', payment._id, null, { amount, method });
  await notify({ user: r.guest, title: 'Payment received', message: `PKR ${amount.toLocaleString()} for booking ${r.code}`, link: '/guest' });
  ok(res, { payment, folio }, 'Payment received', 201);
}

export async function stripeCheckout(req, res) {
  if (!stripeEnabled()) throw new ApiError(400, 'Online payment is not set up');
  const r = await Reservation.findById(req.body.reservation);
  if (!r || !own(req, r.guest)) throw new ApiError(403, 'Not your booking');
  if (['cancelled', 'checked_out', 'no_show'].includes(r.status)) throw new ApiError(400, 'This booking cannot be paid');
  const folio = await Folio.findOne({ reservation: r._id });
  folio.recalculate();
  if (folio.balance <= 0) throw new ApiError(400, 'Nothing to pay');
  const url = await createCheckout(r, folio, req.user);
  ok(res, { url });
}

export async function stripeVerify(req, res) {
  if (!stripeEnabled()) throw new ApiError(400, 'Online payment is not set up');
  if (!req.query.session_id) throw new ApiError(400, 'Missing session');
  ok(res, await confirmSession(String(req.query.session_id), req));
}

// Optional: Stripe calls this by itself (needs STRIPE_WEBHOOK_SECRET). Body must be raw.
export async function stripeWebhook(req, res) {
  if (!stripeEnabled() || !stripeEnv.webhookSecret) return res.status(400).send('Webhook not configured');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], stripeEnv.webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  const id = event.data.object.id;
  // Answer Stripe fast; fulfillment is safe to repeat
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) await confirmSession(id);
  if (['checkout.session.async_payment_failed', 'checkout.session.expired'].includes(event.type)) await markSessionFailed(id);
  res.json({ received: true });
}

// ================= Invoices =================
export async function listInvoices(req, res) {
  const filter = {};
  if (isGuest(req)) filter.guest = req.user._id;
  else if (req.user.role !== 'admin' && req.user.branch) filter.branch = req.user.branch;
  if (req.query.q) filter.number = new RegExp(String(req.query.q).replace(/[^\w-]/g, ''), 'i');
  const list = await Invoice.find(filter)
    .populate('guest', 'name email')
    .populate({ path: 'folio', select: 'total paid balance status' })
    .populate({ path: 'reservation', select: 'code checkIn checkOut' })
    .sort('-issuedAt').limit(300);
  ok(res, list);
}

// Makes an invoice for a booking (pro-forma while the guest is still staying, final after check-out)
export async function createInvoice(req, res) {
  const r = await Reservation.findById(req.body.reservation);
  if (!r) throw new ApiError(404, 'Booking not found');
  if (!canSee(req, r)) throw new ApiError(403, 'Not allowed');
  const folio = await Folio.findOne({ reservation: r._id });
  if (!folio) throw new ApiError(404, 'Bill not found');
  let invoice = await Invoice.findOne({ folio: folio._id });
  if (!invoice) {
    invoice = await Invoice.create({
      number: await nextCode('INV'), folio: folio._id, guest: r.guest, reservation: r._id, branch: r.branch,
      kind: folio.status === 'closed' ? 'final' : 'proforma',
    });
    await audit(req, 'create', 'Invoice', invoice._id, null, { number: invoice.number });
  }
  ok(res, invoice, `Invoice ${invoice.number}`);
}

async function loadInvoice(req) {
  const invoice = await Invoice.findById(req.params.id).populate('guest', 'name email phone');
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  const folio = await Folio.findById(invoice.folio);
  const r = await Reservation.findById(folio.reservation)
    .populate('room', 'number floor').populate('branch', 'name city address phone email').populate('roomType', 'name').populate('createdBy', 'name');
  if (!canSee(req, r)) throw new ApiError(403, 'Not your invoice');
  const payments = await Payment.find({ folio: folio._id, status: 'succeeded' }).sort('createdAt').populate('receivedBy', 'name');
  const settings = (await Setting.findOne({ branch: null })) || {};
  return { invoice, folio, reservation: r, payments, company: settings.company || {} };
}

// JSON for the printable invoice page in the app
export async function getInvoice(req, res) {
  ok(res, await loadInvoice(req));
}

// Professional A4 PDF invoice
export async function invoicePdf(req, res) {
  const { invoice, folio, reservation: r, payments, company } = await loadInvoice(req);
  const download = req.query.download === '1';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${invoice.number}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Invoice ${invoice.number}`, Author: 'LuxuryStay Hospitality' } });
  doc.pipe(res);
  const NAVY = '#141B2D', GOLD = '#C9A24D', GOLD_D = '#8A6A1F', INK = '#1B2236', MUTED = '#6B6455', LINE = '#E8E0CC', IVORY = '#F7F3EA';
  const L = 48, R = 547, W = R - L;
  const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
  const d = (x) => (x ? new Date(x).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-');

  // Header band
  doc.rect(0, 0, 595, 120).fill(NAVY);
  doc.rect(0, 120, 595, 4).fill(GOLD);
  doc.fillColor('#FFFFFF').font('Times-Bold').fontSize(30).text('LuxuryStay', L, 34);
  doc.fillColor(GOLD).font('Helvetica').fontSize(8).text('H O S P I T A L I T Y', L, 70);
  doc.fillColor('#C7CBD8').fontSize(8).text(company.name || 'LuxuryStay Hospitality', L, 88);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18)
    .text(invoice.kind === 'final' ? 'TAX INVOICE' : 'PRO-FORMA INVOICE', 300, 34, { width: R - 300, align: 'right' });
  doc.fillColor('#C7CBD8').font('Helvetica').fontSize(8)
    .text(`${r.branch?.name || ''}\n${r.branch?.address || company.address || ''}\n${r.branch?.phone || company.phone || ''} · ${company.email || ''}`, 300, 60, { width: R - 300, align: 'right' });

  // Meta row
  let y = 146;
  const meta = [['Invoice no.', invoice.number], ['Issue date', d(invoice.issuedAt)], ['Booking', r.code], ['NTN', company.ntn || '-']];
  meta.forEach(([k, v], i) => {
    const x = L + i * (W / 4);
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(k.toUpperCase(), x, y);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10).text(v, x, y + 12, { width: W / 4 - 8 });
  });

  // Bill to + Stay boxes
  y = 196;
  const box = (x, title, lines) => {
    doc.roundedRect(x, y, W / 2 - 8, 92, 6).fillAndStroke(IVORY, LINE);
    doc.fillColor(GOLD_D).font('Helvetica-Bold').fontSize(8).text(title, x + 14, y + 12);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(lines[0], x + 14, y + 28, { width: W / 2 - 36 });
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(lines.slice(1).join('\n'), x + 14, y + 44, { width: W / 2 - 36, lineGap: 2 });
  };
  box(L, 'BILLED TO', [invoice.guest?.name || 'Guest', invoice.guest?.email || '', invoice.guest?.phone || '']);
  box(L + W / 2 + 8, 'STAY DETAILS', [
    `${r.roomType?.name || ''} · Room ${r.room?.number || '-'}`,
    `Check-in: ${d(r.checkIn)}   Check-out: ${d(r.checkOut)}`,
    `${r.nights} night(s) · ${r.adults} adult(s)${r.children ? `, ${r.children} child(ren)` : ''}`,
  ]);

  // Items table
  y = 308;
  const cols = [L + 12, L + 270, L + 330, L + 420];
  doc.rect(L, y, W, 24).fill(NAVY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
  ['DESCRIPTION', 'QTY', 'RATE', 'AMOUNT'].forEach((h, i) => doc.text(h, cols[i], y + 8, i === 3 ? { width: R - cols[3] - 12, align: 'right' } : {}));
  y += 24;
  folio.items.forEach((it, i) => {
    if (i % 2 === 0) doc.rect(L, y, W, 24).fill('#FBF8F1');
    doc.fillColor(INK).font('Helvetica').fontSize(9)
      .text(it.description || it.type, cols[0], y + 8, { width: 250 })
      .text(String(it.qty), cols[1], y + 8)
      .text(money(it.unitPrice), cols[2], y + 8)
      .text(money(it.amount), cols[3], y + 8, { width: R - cols[3] - 12, align: 'right' });
    y += 24;
  });
  doc.moveTo(L, y).lineTo(R, y).strokeColor(LINE).stroke();

  // Totals
  y += 12;
  const tx = 330;
  const line = (label, val, bold, color) => {
    doc.fillColor(color || (bold ? INK : MUTED)).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5)
      .text(label, tx, y).text(val, tx, y, { width: R - tx - 12, align: 'right' });
    y += bold ? 20 : 16;
  };
  line('Subtotal', money(folio.subtotal));
  if (folio.discount) line('Discount', `- ${money(folio.discount)}`);
  line(`Sales tax (${folio.taxRate}%)`, money(folio.taxAmount));
  doc.rect(tx - 8, y - 2, R - tx + 8, 26).fill(NAVY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('TOTAL', tx, y + 6).text(money(folio.total), tx, y + 6, { width: R - tx - 12, align: 'right' });
  y += 34;
  line('Amount paid', money(folio.paid));
  line('Balance due', money(folio.balance), true, folio.balance > 0 ? '#8A2414' : '#1F5A2E');

  // PAID stamp
  if (folio.balance <= 0) {
    doc.save().rotate(-14, { origin: [150, y - 50] });
    doc.roundedRect(70, y - 80, 160, 52, 8).lineWidth(3).strokeColor('#1F5A2E').stroke();
    doc.fillColor('#1F5A2E').font('Helvetica-Bold').fontSize(28).text('PAID', 70, y - 66, { width: 160, align: 'center' });
    doc.restore();
  }

  // Payments
  if (payments.length) {
    y += 10;
    doc.fillColor(GOLD_D).font('Helvetica-Bold').fontSize(8).text('PAYMENTS RECEIVED', L, y);
    y += 14;
    payments.forEach((p) => {
      doc.fillColor(INK).font('Helvetica').fontSize(9)
        .text(`${d(p.createdAt)}  ·  ${p.method.toUpperCase()}${p.receivedBy ? `  ·  by ${p.receivedBy.name}` : ''}`, L, y)
        .text(money(p.amount), L, y, { width: 240, align: 'right' });
      y += 14;
    });
  }

  // Footer
  doc.moveTo(L, 742).lineTo(R, 742).strokeColor(LINE).stroke();
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
    .text('Terms: Check-out 12:00. All amounts in Pakistani Rupees and include applicable taxes. This is a computer-generated invoice and needs no signature.', L, 750, { width: W });
  doc.fillColor(GOLD_D).font('Times-Italic').fontSize(10).text('Thank you for staying with LuxuryStay. We look forward to welcoming you again.', L, 772, { width: W, align: 'center' });
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(`${company.website || ''}  ·  ${company.email || ''}  ·  ${company.phone || ''}`, L, 790, { width: W, align: 'center' });
  doc.end();
}
