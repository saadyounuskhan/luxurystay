import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { GuestProfile } from '../models/GuestProfile.js';
import { LoginEvent } from '../models/LoginEvent.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { audit } from '../middleware/audit.js';
import {
  signAccessToken, signRefreshToken, hashToken,
  setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE,
} from '../services/token.service.js';

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

async function sendTokens(res, user, message, status = 200) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  setRefreshCookie(res, refreshToken);
  return ok(res, { user, accessToken }, message, status);
}

export async function register(req, res) {
  const { name, email, password, phone } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'This email is already registered');

  const user = await User.create({ name, email, password, phone, role: 'guest' });
  await GuestProfile.create({ user: user._id, consent: { privacyAcceptedAt: new Date() } });
  return sendTokens(res, user, 'Account created', 201);
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +failedLogins +lockUntil');
  const log = (success) => LoginEvent.create({ user: user?._id, email, success, ip: req.ip, userAgent: String(req.headers['user-agent'] || '').slice(0, 200) }).catch(() => {});
  if (!user) { await log(false); throw new ApiError(401, 'Wrong email or password'); }
  if (!user.isActive) throw new ApiError(403, 'Your account is deactivated');
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(423, `Account locked. Try again after ${LOCK_MINUTES} minutes`);
  }

  const match = await user.checkPassword(password);
  if (!match) {
    user.failedLogins += 1;
    if (user.failedLogins >= MAX_TRIES) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLogins = 0;
    }
    await user.save({ validateBeforeSave: false });
    await log(false);
    throw new ApiError(401, 'Wrong email or password');
  }
  await log(true);

  user.failedLogins = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  req.user = user;
  await audit(req, 'login', 'User', user._id);
  return sendTokens(res, user, 'Logged in');
}

// New access token using the refresh cookie (token rotation)
export async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new ApiError(401, 'Please log in');

  let payload;
  try {
    payload = jwt.verify(token, env.refreshSecret);
  } catch {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Session expired, please log in');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || user.refreshTokenHash !== hashToken(token)) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Session expired, please log in');
  }
  return sendTokens(res, user, 'Token refreshed');
}

export async function logout(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await User.updateOne({ refreshTokenHash: hashToken(token) }, { $unset: { refreshTokenHash: 1 } });
  }
  clearRefreshCookie(res);
  return ok(res, null, 'Logged out');
}

export async function getMe(req, res) {
  const user = await User.findById(req.user._id).populate('branch', 'name city');
  const profile = user.role === 'guest' ? await GuestProfile.findOne({ user: user._id }) : null;
  return ok(res, { user, profile });
}

export async function updateMe(req, res) {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true, runValidators: true });
  return ok(res, { user }, 'Profile updated');
}

// Every role (admin too) can change their own password
export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  const ok1 = await user.checkPassword(req.body.currentPassword);
  if (!ok1) throw new ApiError(400, 'Current password is wrong');
  user.password = req.body.newPassword;
  await user.save();
  await audit(req, 'update', 'User', user._id, null, { passwordChanged: true });
  return sendTokens(res, user, 'Password changed');
}

export async function loginHistory(req, res) {
  ok(res, await LoginEvent.find({ user: req.user._id }).sort('-at').limit(15));
}

// Logs the user out on every phone and computer
export async function logoutAll(req, res) {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 }, $unset: { refreshTokenHash: 1 } });
  clearRefreshCookie(res);
  await audit(req, 'update', 'User', req.user._id, null, { logoutAll: true });
  ok(res, null, 'Logged out from all devices');
}
