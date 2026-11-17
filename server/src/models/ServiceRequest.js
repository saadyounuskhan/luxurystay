import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    type: {
      type: String,
      enum: ['room_service', 'laundry', 'wake_up', 'transport', 'housekeeping', 'late_checkout', 'other'],
      required: true,
    },
    details: String,
    scheduledAt: Date,
    price: { type: Number, default: 0 },
    status: { type: String, enum: ['requested', 'accepted', 'in_progress', 'done', 'cancelled'], default: 'requested' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const ServiceRequest = mongoose.model('ServiceRequest', schema);
