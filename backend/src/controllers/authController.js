import { supabaseAdmin } from '../utils/db.js';
import { recordAuditEvent } from '../utils/auditLogger.js';
import { createClient } from '@supabase/supabase-js';

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
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
      .select('*, pharmacies(id, name, address, phone, tier, subscription_status, trial_ends_at, current_period_end)')
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
    
    const pharmacy = profile?.pharmacies || {};
    res.json({ 
      user: req.user, 
      profile: out, 
      tier: pharmacy.tier || 'starter',
      subscription_status: pharmacy.subscription_status || 'trial',
      trial_ends_at: pharmacy.trial_ends_at,
      current_period_end: pharmacy.current_period_end
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export function logout(req, res) {
  res.json({ message: 'Logged out' });
}

export async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    const redirectBase = process.env.FRONTEND_URL || '';
    const redirectTo = redirectBase
      ? `${redirectBase.replace(/\/$/, '')}/reset-password`
      : undefined;

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ message: 'Password reset email sent if the account exists.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send reset email' });
  }
}

export async function listUsers(req, res) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', req.user.id)
      .single();

    const pharmacyId = profile?.pharmacy_id;

    let q = supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: true });

    if (pharmacyId) q = q.eq('pharmacy_id', pharmacyId);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
}

export async function addStaff(req, res) {
  try {
    const pharmacyId = req.userPharmacyId;
    const { email, full_name, password, role = 'STAFF' } = req.body || {};

    if (!email || !full_name || !password) {
      return res.status(400).json({ error: 'Email, full name and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!['ADMIN', 'STAFF'].includes(role)) {
      return res.status(400).json({ error: 'Role must be ADMIN or STAFF' });
    }

    // Check staff count vs tier limit
    const maxStaff = req.tierFeatures?.maxStaff;
    if (maxStaff && maxStaff !== Infinity) {
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('pharmacy_id', pharmacyId);
      if (count >= maxStaff) {
        return res.status(400).json({
          error: `Staff limit reached. Your ${req.tier} plan allows ${maxStaff} staff members.` 
        });
      }
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (authError) return res.status(400).json({ error: authError.message });

    // Upsert profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        full_name,
        role,
        pharmacy_id: pharmacyId,
        is_active: true,
      }, { onConflict: 'id' })
      .select()
      .single();
    if (profileError) throw profileError;

    await recordAuditEvent(req, {
      action: 'ADD_STAFF',
      resource: 'profile',
      resourceId: profile.id,
      details: { email, full_name, role },
    });

    res.status(201).json(profile);
  } catch (error) {
    console.error('Error adding staff:', error);
    res.status(500).json({ error: 'Failed to add staff member' });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!['ADMIN', 'STAFF'].includes(role)) {
      return res.status(400).json({ error: 'Role must be ADMIN or STAFF' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    // Verify target user belongs to same pharmacy
    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id, full_name')
      .eq('id', id)
      .single();
    if (!target || target.pharmacy_id !== req.userPharmacyId) {
      return res.status(403).json({ error: 'User not found in your pharmacy' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await recordAuditEvent(req, {
      action: 'UPDATE_STAFF_ROLE',
      resource: 'profile',
      resourceId: id,
      details: { full_name: target.full_name, new_role: role },
    });

    res.json(profile);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
}

export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body || {};

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    // Verify target user belongs to same pharmacy
    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id, full_name')
      .eq('id', id)
      .single();
    if (!target || target.pharmacy_id !== req.userPharmacyId) {
      return res.status(403).json({ error: 'User not found in your pharmacy' });
    }

    // Ban or unban in Supabase Auth
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: is_active ? 'none' : '876600h',
    });

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await recordAuditEvent(req, {
      action: is_active ? 'REACTIVATE_STAFF' : 'DEACTIVATE_STAFF',
      resource: 'profile',
      resourceId: id,
      details: { full_name: target.full_name },
    });

    res.json(profile);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
}
