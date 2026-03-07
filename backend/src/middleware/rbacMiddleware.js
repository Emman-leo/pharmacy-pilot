import { supabaseAdmin } from '../utils/db.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.userRole || 'STAFF';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
