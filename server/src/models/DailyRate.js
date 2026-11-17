import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    date: { type: Date, required: true },
    suggestedPrice: Number,
    approvedPrice: Number,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
  },
  { timestamps: true }
);
schema.index({ roomType: 1, date: 1 }, { unique: true });

export const DailyRate = mongoose.model('DailyRate', schema);
