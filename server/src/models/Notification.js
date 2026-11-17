import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    title: { type: String, required: true },
    message: String,
    type: { type: String, default: 'info' },
    link: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);
schema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', schema);
