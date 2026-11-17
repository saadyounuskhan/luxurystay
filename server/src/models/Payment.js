import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    folio: { type: mongoose.Schema.Types.ObjectId, ref: 'Folio', required: true },
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['cash', 'card', 'stripe', 'online'], required: true },
    stripeSessionId: String,
    stripePaymentIntentId: String,
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: 'pending' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', schema);
