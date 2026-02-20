import { supabaseAdmin } from '../utils/db.js';

/** GET /pharmacies - list pharmacies (for admin or dropdown). Uses user JWT so RLS applies. */
export async function listPharmacies(req, res) {
  try {
    const { data, error } = await req.supabase
      .from('pharmacies')
      .select('id, name, address, phone')
      .order('name');
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
