import Stripe from 'stripe';
import { stripeEnv, env } from '../config/env.js';
import { Folio, Payment, Reservation } from '../models/index.js';
import { notify } from './notify.service.js';
import { audit } from '../middleware/audit.js';
import { logger } from '../config/logger.js';

// Stripe works only when STRIPE_SECRET_KEY is in .env (test key starts with sk_test_). Never put keys in code.
export const stripe = stripeEnv.secretKey ? new Stripe(stripeEnv.secretKey) : null;
export const stripeEnabled = () => !!stripe;

function lineItem(reservation, amountPkr, currency) {
  // If PKR is not allowed on the Stripe account, we charge the same value in USD
  const unit = currency === 'pkr' ? Math.round(amountPkr * 100) : Math.max(50, Math.round((amountPkr / stripeEnv.usdRate) * 100));
  return {
    quantity: 1,
    price_data: {
      currency,
      unit_amount: unit, // smallest unit (paisa / cents)
      product_data: {
        name: `LuxuryStay booking ${reservation.code}`,
        description: `${reservation.nights} night(s)${currency !== 'pkr' ? ` · PKR ${amountPkr.toLocaleString()} charged in USD` : ''}`,
      },
    },
  };
}

// Hosted Stripe Checkout page for the unpaid balance. Returns the URL to redirect the guest to.
export async function createCheckout(reservation, folio, user) {
  const amount = folio.balance;
  const params = (currency) => ({
    mode: 'payment',
    customer_email: user.email,
    client_reference_id: String(reservation._id),
    metadata: { reservation: String(reservation._id), folio: String(folio._id), amountPkr: String(amount) },
    payment_intent_data: { description: `LuxuryStay ${reservation.code}`, metadata: { reservation: String(reservation._id) } },
    line_items: [lineItem(reservation, amount, currency)],
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // link valid for 1 hour
    success_url: `${env.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}/payment/cancelled?reservation=${reservation._id}`,
  });

  let session;
  try {
    session = await stripe.checkout.sessions.create(params(stripeEnv.currency));
  } catch (err) {
    const currencyProblem = /currency|amount must|minimum/i.test(err.message || '');
    if (!currencyProblem || stripeEnv.currency === 'usd') throw err;
    logger.warn(`Stripe rejected ${stripeEnv.currency.toUpperCase()}, retrying in USD: ${err.message}`);
    session = await stripe.checkout.sessions.create(params('usd'));
  }
  await Payment.create({ folio: folio._id, reservation: reservation._id, amount, method: 'stripe', status: 'pending', stripeSessionId: session.id, receivedBy: user._id });
  return session.url;
}

// Fulfillment: safe to call many times, even at the same moment (webhook + success page).
// Only the first call that flips the payment from "pending" to "succeeded" updates the bill.
export async function confirmSession(sessionId, req) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const existing = await Payment.findOne({ stripeSessionId: sessionId });
  if (!existing) return { paid: false, reason: 'Payment not found' };
  if (existing.status === 'succeeded') return { paid: true, payment: existing, reservation: existing.reservation };
  if (session.payment_status === 'unpaid') return { paid: false, reason: session.status === 'expired' ? 'Payment link expired' : 'Payment not completed yet' };

  const payment = await Payment.findOneAndUpdate(
    { stripeSessionId: sessionId, status: 'pending' },
    { status: 'succeeded', stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id },
    { new: true }
  );
  if (!payment) return { paid: true, payment: existing, reservation: existing.reservation }; // another call already did it

  const folio = await Folio.findById(payment.folio);
  folio.paid += payment.amount;
  folio.recalculate();
  await folio.save();
  const r = await Reservation.findById(payment.reservation);
  if (req) await audit(req, 'create', 'Payment', payment._id, null, { amount: payment.amount, method: 'stripe' });
  await notify({ user: r.guest, title: 'Payment received', message: `PKR ${payment.amount.toLocaleString()} paid online for ${r.code}`, link: '/guest' });
  await notify({ role: 'receptionist', title: 'Online payment', message: `${r.code} paid PKR ${payment.amount.toLocaleString()} via Stripe`, type: 'payment' });
  return { paid: true, payment, reservation: r._id };
}

export async function markSessionFailed(sessionId) {
  await Payment.updateOne({ stripeSessionId: sessionId, status: 'pending' }, { status: 'failed' });
}
