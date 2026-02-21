import { supabaseAdmin } from '../utils/db.js';

// GET /admin/audit-logs
// Admin-only. Pharmacy admins see their pharmacy by default; super admins (no pharmacy) see all.
// Query: pharmacy_id (uuid or "all" to show all), user_id, role, action, resource, from, to
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
    pharmacy_id: pharmacyIdParam,
  } = req.query || {};

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', req.user.id)
      .single();

    const userPharmacyId = profile?.pharmacy_id ?? null;
    let filterPharmacyId = null;
    if (pharmacyIdParam === 'all' || pharmacyIdParam === '') {
      filterPharmacyId = null; // show all
    } else if (pharmacyIdParam) {
      filterPharmacyId = pharmacyIdParam; // explicit filter (admin only in practice)
    } else if (userPharmacyId) {
      filterPharmacyId = userPharmacyId; // pharmacy admin: default to own pharmacy
    }

    let q = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(
        parseInt(offset, 10),
        parseInt(offset, 10) + parseInt(limit, 10) - 1
      );

    if (filterPharmacyId) q = q.eq('pharmacy_id', filterPharmacyId);
    if (user_id) q = q.eq('user_id', user_id);
    if (role) q = q.eq('role', role);
    if (action) q = q.eq('action', action);
    if (resource) q = q.eq('resource', resource);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);

    const { data: logs, error } = await q;
    if (error) throw error;

    const userIds = [...new Set((logs || []).map((log) => log.user_id).filter(Boolean))];
    const profilesMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      (profiles || []).forEach((p) => { profilesMap[p.id] = p; });
    }

    const pharmacyIds = [...new Set((logs || []).map((log) => log.pharmacy_id).filter(Boolean))];
    const pharmaciesMap = {};
    if (pharmacyIds.length > 0) {
      const { data: pharmacies } = await supabaseAdmin
        .from('pharmacies')
        .select('id, name')
        .in('id', pharmacyIds);
      (pharmacies || []).forEach((p) => { pharmaciesMap[p.id] = p; });
    }

    const transformed = (logs || []).map((log) => {
      const profileRow = log.user_id ? profilesMap[log.user_id] : null;
      const pharmacyRow = log.pharmacy_id ? pharmaciesMap[log.pharmacy_id] : null;
      return {
        ...log,
        user_email: log.user_email ?? profileRow?.email ?? null,
        user_name: log.user_name ?? profileRow?.full_name ?? null,
        pharmacy_name: pharmacyRow?.name ?? null,
      };
    });

    res.json(transformed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
}

