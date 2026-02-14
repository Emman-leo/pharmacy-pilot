import { supabaseAdmin } from '../utils/db.js';

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      const role = profile?.role || 'STAFF';
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.userRole = role;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}
