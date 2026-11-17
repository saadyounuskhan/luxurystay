// Staff only see their own branch. Admin sees all, or one branch with ?branch=<id>
export function branchFilter(req) {
  if (req.user.role === 'admin') return req.query.branch ? { branch: req.query.branch } : {};
  return req.user.branch ? { branch: req.user.branch } : {};
}
export const STAFF = ['admin', 'manager', 'receptionist', 'housekeeping'];
export const DESK = ['admin', 'manager', 'receptionist'];
export const MGMT = ['admin', 'manager'];
