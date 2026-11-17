import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

// Like protect, but lets visitors through. If a valid token is sent, req.user is set.
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), env.accessSecret);
      const user = await User.findById(payload.sub);
      if (user?.isActive && (payload.tv || 0) === (user.tokenVersion || 0)) req.user = user;
    } catch { /* treat as visitor */ }
  }
  next();
}
