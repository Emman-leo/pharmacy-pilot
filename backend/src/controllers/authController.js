import { supabaseAdmin } from '../utils/db.js';
import { recordAuditEvent } from '../utils/auditLogger.js';

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

    await recordAuditEvent(
      // shim a minimal req-like object so user_id can be captured if present later
      { user: data.user, headers: req.headers, ip: req.ip },
      {
        action: 'LOGIN',
        resource: 'auth',
        resourceId: data.user?.id ?? null,
        details: { email },
      },
    );

    res.json({ user: data.user, session: data.session });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function register(req, res) {
  const { email, password, full_name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });
    if (error) return res.status(400).json({ error: error.message });

    await recordAuditEvent(
      { user: data.user, headers: req.headers, ip: req.ip },
      {
        action: 'REGISTER',
        resource: 'auth',
        resourceId: data.user?.id ?? null,
        details: { email, full_name },
      },
    );

    res.status(201).json({ user: data.user, session: data.session });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function getUser(req, res) {
  try {
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*, pharmacies(id, name, address, phone)')
      .eq('id', req.user.id)
      .single();

    if (!profile) {
      const { data: inserted } = await supabaseAdmin.from('profiles').upsert({
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.user_metadata?.full_name || '',
        role: 'STAFF',
      }, { onConflict: 'id' }).select().single();
      profile = inserted;
    }

    const out = profile ? { ...profile, pharmacy: profile.pharmacies || null } : {};
    if (out.pharmacies !== undefined) delete out.pharmacies;
    res.json({ user: req.user, profile: out });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export function logout(req, res) {
  res.json({ message: 'Logged out' });
}
