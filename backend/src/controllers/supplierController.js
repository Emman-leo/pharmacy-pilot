import { getProfile } from '../utils/profileUtils.js';

export async function getSuppliers(req, res) {
  try {
    const profile = await getProfile(req);
    const { data, error } = await req.supabase
      .from('suppliers')
      .select('*')
      .eq('pharmacy_id', profile.pharmacy_id)
      .order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch suppliers' });
  }
}

export async function addSupplier(req, res) {
  const { name, phone, address } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Supplier name is required' });
  try {
    const profile = await getProfile(req);
    const { data, error } = await req.supabase
      .from('suppliers')
      .insert({
        pharmacy_id: profile.pharmacy_id,
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to add supplier' });
  }
}
