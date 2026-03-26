import { supabaseAdmin } from '../utils/db.js';
import { recordAuditEvent } from '../utils/auditLogger.js';

/** GET /pharmacies - list pharmacies. Pharmacy users see only their pharmacy; super admins (no pharmacy) see all. */
export async function listPharmacies(req, res) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', req.user.id)
      .single();

    const pharmacyId = profile?.pharmacy_id;
    let q = req.supabase.from('pharmacies').select('id, name, address, phone, tier, subscription_status').order('name');
    if (pharmacyId) {
      q = q.eq('id', pharmacyId);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch pharmacies' });
  }
}

/** GET /pharmacies/my-settings - current user's pharmacy settings (if any). */
export async function getMyPharmacySettings(req, res) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', req.user.id)
      .single();

    const pharmacyId = profile?.pharmacy_id;
    if (!pharmacyId) {
      return res.json({ pharmacy_id: null, settings: null });
    }

    const { data: settings, error } = await req.supabase
      .from('pharmacy_settings')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ pharmacy_id: pharmacyId, settings: settings || null });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch pharmacy settings' });
  }
}

export async function getStaffCount(req, res) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', req.user.id)
      .single();

    const pharmacyId = profile?.pharmacy_id;
    if (!pharmacyId) return res.json({ count: 0, max: Infinity, tier: req.tier });

    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId);

    if (error) throw error;

    const maxStaff = req.tierFeatures?.maxStaff ?? 2;

    res.json({
      count,
      max: maxStaff === Infinity ? null : maxStaff,
      tier: req.tier,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch staff count' });
  }
}

/** PUT /pharmacies/my-settings - update current user's pharmacy info (ADMIN only). */
export async function updateMyPharmacySettings(req, res) {
  const { name, address, phone } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Pharmacy name is required' });
  }

  if (address != null && typeof address !== 'string') {
    return res.status(400).json({ error: 'address must be a string' });
  }
  if (phone != null && typeof phone !== 'string') {
    return res.status(400).json({ error: 'phone must be a string' });
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', req.user.id)
      .single();

    const pharmacyId = profile?.pharmacy_id;
    if (!pharmacyId) return res.status(400).json({ error: 'Pharmacy not found' });

    const { data, error } = await supabaseAdmin
      .from('pharmacies')
      .update({
        name: name.trim(),
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null,
      })
      .eq('id', pharmacyId)
      .select()
      .single();

    if (error) throw error;

    await recordAuditEvent(req, {
      action: 'UPDATE_PHARMACY_SETTINGS',
      resource: 'pharmacy',
      resourceId: pharmacyId,
      details: { name: data.name, address: data.address, phone: data.phone },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update pharmacy settings' });
  }
}
