import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    idType: { type: String, enum: ['cnic', 'passport', 'other'] },
    idNumber: String,
    nationality: String,
    address: String,
    dob: Date,
    preferences: { bedType: String, floor: String, diet: String, notes: String },
    loyalty: {
      points: { type: Number, default: 0 },
      tier: { type: String, enum: ['silver', 'gold', 'platinum'], default: 'silver' },
    },
    consent: { marketing: { type: Boolean, default: false }, privacyAcceptedAt: Date },
    vip: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const GuestProfile = mongoose.model('GuestProfile', schema);
