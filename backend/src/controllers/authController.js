import { supabaseAdmin } from '../utils/db.js';

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
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
    res.status(201).json({ user: data.user, session: data.session });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function getUser(req, res) {
  try {
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
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
    res.json({ user: req.user, profile: profile || {} });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export function logout(req, res) {
  res.json({ message: 'Logged out' });
}
