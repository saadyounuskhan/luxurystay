import mongoose from 'mongoose';

export const RES_STATUS = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];

const schema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    roomType: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true },
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    status: { type: String, enum: RES_STATUS, default: 'pending' },
    source: { type: String, enum: ['online', 'walk_in', 'phone'], default: 'online' },
    ratePerNight: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    specialRequests: String,
    holdExpiresAt: Date,
    qrKeyToken: String,
    checkedInAt: Date,
    checkedOutAt: Date,
    cancelledAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
schema.index({ room: 1, checkIn: 1, checkOut: 1 });
schema.index({ roomType: 1, checkIn: 1, checkOut: 1, status: 1 });
schema.index({ guest: 1, createdAt: -1 });

export const Reservation = mongoose.model('Reservation', schema);
