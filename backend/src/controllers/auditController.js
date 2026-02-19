import { supabaseAdmin } from '../utils/db.js';

// GET /admin/audit-logs
// Admin-only audit log listing with basic filtering and pagination
export async function listAuditLogs(req, res) {
  const {
    limit = 50,
    offset = 0,
    user_id,
    role,
    action,
    resource,
    from,
    to,
  } = req.query || {};

  try {
    let q = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(
        parseInt(offset, 10),
        parseInt(offset, 10) + parseInt(limit, 10) - 1
      );

    if (user_id) q = q.eq('user_id', user_id);
    if (role) q = q.eq('role', role);
    if (action) q = q.eq('action', action);
    if (resource) q = q.eq('resource', resource);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);

    const { data: logs, error } = await q;
    if (error) throw error;

    // Fetch user profiles for all unique user_ids
    const userIds = [...new Set((logs || []).map((log) => log.user_id).filter(Boolean))];
    const profilesMap = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      (profiles || []).forEach((profile) => {
        profilesMap[profile.id] = profile;
      });
    }

    // Transform data to include user info
    const transformed = (logs || []).map((log) => {
      const profile = log.user_id ? profilesMap[log.user_id] : null;
      return {
        ...log,
        user_email: profile?.email || null,
        user_name: profile?.full_name || null,
      };
    });

    res.json(transformed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
}

