import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    totalRooms: Number,
    occupiedRooms: Number,
    occupancy: Number,
    revenue: Number,
    adr: Number,
    revpar: Number,
    arrivals: Number,
    departures: Number,
    noShows: Number,
    noShowCodes: [String],
    openBalances: Number,
    cashTotal: Number,
    cardTotal: Number,
    onlineTotal: Number,
    runBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    auto: { type: Boolean, default: false },
  },
  { timestamps: true }
);
schema.index({ branch: 1, date: 1 }, { unique: true });

export const NightAudit = mongoose.model('NightAudit', schema);
