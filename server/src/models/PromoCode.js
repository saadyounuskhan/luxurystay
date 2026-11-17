import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    percent: { type: Number, required: true, min: 1, max: 90 },
    maxUses: { type: Number, default: 100 },
    used: { type: Number, default: 0 },
    minNights: { type: Number, default: 1 },
    validFrom: Date,
    validTo: Date,
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const PromoCode = mongoose.model('PromoCode', schema);
