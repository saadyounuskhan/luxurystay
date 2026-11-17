import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

// Checks the access token: header "Authorization: Bearer <token>"
export async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Please log in');

  let payload;
  try {
    payload = jwt.verify(token, env.accessSecret);
  } catch {
    throw new ApiError(401, 'Session expired, please log in again');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not active');
  if ((payload.tv || 0) !== (user.tokenVersion || 0)) throw new ApiError(401, 'You were logged out. Please log in again');
  req.user = user;
  next();
}
