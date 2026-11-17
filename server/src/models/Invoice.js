import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    folio: { type: mongoose.Schema.Types.ObjectId, ref: 'Folio', required: true, unique: true },
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    kind: { type: String, enum: ['proforma', 'final'], default: 'final' },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pdfUrl: String,
    issuedAt: { type: Date, default: Date.now },
    emailedAt: Date,
  },
  { timestamps: true }
);

export const Invoice = mongoose.model('Invoice', schema);
