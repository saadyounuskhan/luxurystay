import { ApiError } from '../utils/ApiError.js';

// Usage: authorize('admin', 'manager')
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, 'You do not have permission for this');
  }
  next();
};
