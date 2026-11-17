import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  type: { type: String, enum: ['room', 'food', 'laundry', 'transport', 'other'], required: true },
  description: String,
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  amount: Number,
  date: { type: Date, default: Date.now },
});

const schema = new mongoose.Schema(
  {
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [itemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 16 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

// Totals are always worked out here, so they can never be wrong
schema.methods.recalculate = function () {
  this.items.forEach((i) => (i.amount = i.qty * i.unitPrice));
  this.subtotal = this.items.reduce((s, i) => s + i.amount, 0);
  const taxable = Math.max(this.subtotal - this.discount, 0);
  this.taxAmount = Math.round((taxable * this.taxRate) / 100);
  this.total = taxable + this.taxAmount;
  this.balance = this.total - this.paid;
};

export const Folio = mongoose.model('Folio', schema);
