import { supabaseAdmin } from './db.js';

/**
 * Record an audit event. Errors are swallowed so logging never breaks the main flow.
 * Expects an `audit_logs` table with at least:
 *   user_id (uuid), role (text), action (text), resource (text),
 *   resource_id (text/uuid), details (jsonb), ip (text), user_agent (text), created_at (timestamp).
 */
export async function recordAuditEvent(req, {
  action,
  resource,
  resourceId = null,
  details = null,
} = {}) {
  try {
    const userId = req.user?.id ?? null;
    const role = req.userRole ?? null;
    const ip =
      (req.headers['x-forwarded-for']?.split(',')[0] || '').trim() ||
      req.ip ||
      null;
    const userAgent = req.headers['user-agent'] || null;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      role,
      action,
      resource,
      resource_id: resourceId,
      details,
      ip,
      user_agent: userAgent,
    });
  } catch {
    // Intentionally ignore audit logging failures
  }
}

