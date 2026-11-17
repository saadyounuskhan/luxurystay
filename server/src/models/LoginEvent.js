import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  email: String,
  success: Boolean,
  ip: String,
  userAgent: String,
  at: { type: Date, default: Date.now },
});

export const LoginEvent = mongoose.model('LoginEvent', schema);
