import { supabaseAdmin } from './db.js';

export async function getProfile(req) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('pharmacy_id, role')
    .eq('id', req.user.id)
    .single();
  return data;
}
