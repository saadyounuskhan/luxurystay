import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = ['admin', 'manager', 'receptionist', 'housekeeping', 'guest'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: 'guest' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    failedLogins: { type: Number, default: 0 },
    lockUntil: Date,
    lastLogin: Date,
    refreshTokenHash: { type: String, select: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Rule: the system has exactly one admin (the owner). A second admin can never be created,
// and nobody can be promoted to admin.
userSchema.pre('save', async function () {
  if (this.role === 'admin' && (this.isNew || this.isModified('role'))) {
    const other = await this.constructor.exists({ role: 'admin', _id: { $ne: this._id } });
    if (other) throw Object.assign(new Error('There can only be one admin'), { statusCode: 403 });
  }
  if (this.role === 'admin' && this.isModified('isActive') && !this.isActive) {
    throw Object.assign(new Error('The admin account cannot be deactivated'), { statusCode: 403 });
  }
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.failedLogins;
  delete obj.lockUntil;
  delete obj.tokenVersion;
  return obj;
};

export const User = mongoose.model('User', userSchema);
