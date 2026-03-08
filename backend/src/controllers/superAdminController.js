import { supabaseAdmin } from '../utils/db.js';
import { recordAuditEvent } from '../utils/auditLogger.js';

// Tier staff limits
const TIER_LIMITS = {
  starter: 2,
  growth: 10,
  pro: 50
};

export async function getStats(req, res) {
  try {
    const { data: pharmacies, error: pharmaciesError } = await supabaseAdmin
      .from('pharmacies')
      .select('subscription_status, tier');

    if (pharmaciesError) throw pharmaciesError;

    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id');

    if (usersError) throw usersError;

    const stats = {
      total_pharmacies: pharmacies.length,
      active_subscriptions: pharmacies.filter(p => p.subscription_status === 'active').length,
      trial_pharmacies: pharmacies.filter(p => p.subscription_status === 'trial').length,
      total_users: users.length,
      by_tier: {
        starter: pharmacies.filter(p => p.tier === 'starter').length,
        growth: pharmacies.filter(p => p.tier === 'growth').length,
        pro: pharmacies.filter(p => p.tier === 'pro').length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
}

export async function listPharmacies(req, res) {
  try {
    const { data: pharmacies, error: pharmaciesError } = await supabaseAdmin
      .from('pharmacies')
      .select(`
        id, 
        name, 
        address, 
        phone, 
        tier, 
        subscription_status, 
        trial_ends_at, 
        created_at
      `)
      .order('created_at', { ascending: false });

    if (pharmaciesError) throw pharmaciesError;

    // Get staff count for each pharmacy
    const pharmacyIds = pharmacies.map(p => p.id);
    const { data: staffCounts, error: staffError } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .in('pharmacy_id', pharmacyIds);

    if (staffError) throw staffError;

    const pharmaciesWithStaff = pharmacies.map(pharmacy => ({
      ...pharmacy,
      staff_count: staffCounts.filter(s => s.pharmacy_id === pharmacy.id).length
    }));

    res.json(pharmaciesWithStaff);
  } catch (error) {
    console.error('Error listing pharmacies:', error);
    res.status(500).json({ error: 'Failed to fetch pharmacies' });
  }
}

export async function createPharmacy(req, res) {
  try {
    const { name, address, phone, tier = 'starter', subscription_status = 'trial', trial_ends_at } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Pharmacy name is required' });
    }

    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from('pharmacies')
      .insert({
        name: name.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        tier,
        subscription_status,
        trial_ends_at: trial_ends_at || null
      })
      .select()
      .single();

    if (pharmacyError) throw pharmacyError;

    await recordAuditEvent(req, {
      action: 'CREATE_PHARMACY',
      resource: 'pharmacy',
      resourceId: pharmacy.id,
      details: { name, tier, subscription_status }
    });

    res.status(201).json(pharmacy);
  } catch (error) {
    console.error('Error creating pharmacy:', error);
    res.status(500).json({ error: 'Failed to create pharmacy' });
  }
}

export async function updatePharmacy(req, res) {
  try {
    const { id } = req.params;
    const { name, address, phone, tier, subscription_status, trial_ends_at } = req.body;

    // Build update object with only provided fields
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (address !== undefined) updates.address = address?.trim() || null;
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (tier !== undefined) updates.tier = tier;
    if (subscription_status !== undefined) updates.subscription_status = subscription_status;
    if (trial_ends_at !== undefined) updates.trial_ends_at = trial_ends_at;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from('pharmacies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (pharmacyError) {
      if (pharmacyError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Pharmacy not found' });
      }
      throw pharmacyError;
    }

    await recordAuditEvent(req, {
      action: 'UPDATE_PHARMACY',
      resource: 'pharmacy',
      resourceId: id,
      details: updates
    });

    res.json(pharmacy);
  } catch (error) {
    console.error('Error updating pharmacy:', error);
    res.status(500).json({ error: 'Failed to update pharmacy' });
  }
}

export async function listPharmacyUsers(req, res) {
  try {
    const { id } = req.params;

    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, is_active, created_at')
      .eq('pharmacy_id', id)
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    res.json(users);
  } catch (error) {
    console.error('Error listing pharmacy users:', error);
    res.status(500).json({ error: 'Failed to fetch pharmacy users' });
  }
}

export async function createPharmacyUser(req, res) {
  try {
    const { id: pharmacyId } = req.params;
    const { email, full_name, role = 'STAFF', password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check current staff count vs tier limit
    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from('pharmacies')
      .select('tier')
      .eq('id', pharmacyId)
      .single();

    if (pharmacyError) {
      if (pharmacyError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Pharmacy not found' });
      }
      throw pharmacyError;
    }

    const { data: existingStaff, error: staffError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true);

    if (staffError) throw staffError;

    const maxStaff = TIER_LIMITS[pharmacy.tier] || TIER_LIMITS.starter;
    if (existingStaff.length >= maxStaff) {
      return res.status(400).json({ 
        error: `Staff limit reached for ${pharmacy.tier} tier (${maxStaff} users)` 
      });
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: full_name.trim(),
        role: role.toUpperCase()
      }
    });

    if (authError) throw authError;

    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        email: email.trim(),
        full_name: full_name.trim(),
        role: role.toUpperCase(),
        pharmacy_id: pharmacyId,
        is_active: true
      })
      .select()
      .single();

    if (profileError) throw profileError;

    await recordAuditEvent(req, {
      action: 'CREATE_USER',
      resource: 'user',
      resourceId: profile.id,
      details: { 
        email, 
        full_name, 
        role, 
        pharmacy_id: pharmacyId 
      }
    });

    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating pharmacy user:', error);
    
    if (error.message?.includes('already registered')) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    res.status(500).json({ error: 'Failed to create user' });
  }
}
