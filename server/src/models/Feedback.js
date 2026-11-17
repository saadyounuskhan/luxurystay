import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    categories: { cleanliness: Number, service: Number, food: Number, value: Number },
    comment: String,
    reply: { text: String, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Feedback = mongoose.model('Feedback', schema);
