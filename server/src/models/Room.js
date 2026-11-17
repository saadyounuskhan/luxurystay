import mongoose from 'mongoose';

export const ROOM_STATUS = ['available', 'reserved', 'occupied', 'maintenance'];
export const ROOM_CONDITION = ['clean', 'dirty', 'inspected'];

const schema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    number: { type: String, required: true },
    floor: { type: Number, required: true },
    status: { type: String, enum: ROOM_STATUS, default: 'available' },
    condition: { type: String, enum: ROOM_CONDITION, default: 'clean' },
    isOutOfOrder: { type: Boolean, default: false },
    notes: String,
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);
schema.index({ branch: 1, number: 1 }, { unique: true });
schema.index({ branch: 1, status: 1 });

export const Room = mongoose.model('Room', schema);
