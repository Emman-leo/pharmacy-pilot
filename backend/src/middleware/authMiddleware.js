import { supabaseAdmin, createSupabaseClient } from '../utils/db.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    req.supabase = createSupabaseClient(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
