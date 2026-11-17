import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    company: {
      name: { type: String, default: 'LuxuryStay Hospitality (Pvt) Ltd' },
      ntn: { type: String, default: '0000000-0' },
      email: { type: String, default: 'billing@luxurystay.pk' },
      phone: { type: String, default: '+92 21 111 589 789' },
      website: { type: String, default: 'www.luxurystay.pk' },
      address: { type: String, default: 'Clifton Block 5, Karachi, Pakistan' },
    },
    taxRate: { type: Number, default: 16 },
    currency: { type: String, default: 'PKR' },
    cancellationPolicy: { freeHours: { type: Number, default: 48 }, feePercent: { type: Number, default: 20 } },
    seasons: [{ name: String, from: Date, to: Date, multiplier: Number }],
    pricingRules: {
      weekendMultiplier: { type: Number, default: 1.15 },
      minPrice: { type: Number, default: 0 },
      maxPrice: { type: Number, default: 0 },
    },
    loyalty: { pointsPerPKR: { type: Number, default: 0.01 } },
  },
  { timestamps: true }
);

export const Setting = mongoose.model('Setting', schema);
