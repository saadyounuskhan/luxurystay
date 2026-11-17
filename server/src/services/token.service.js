import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export const REFRESH_COOKIE = 'ls_refresh';

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, tv: user.tokenVersion || 0 }, env.accessSecret, { expiresIn: env.accessExpires });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, env.refreshSecret, { expiresIn: `${env.refreshDays}d` });
}

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: env.refreshDays * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
}
