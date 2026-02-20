import { supabaseAdmin } from '../utils/db.js';
import { fefoService } from '../services/fefoService.js';
import { recordAuditEvent } from '../utils/auditLogger.js';

export async function getDrugs(req, res) {
  const { search, category, controlled } = req.query;
  try {
    let q = req.supabase.from('drugs').select('*').order('name');
    if (search) q = q.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%`);
    if (category) q = q.eq('category', category);
    if (controlled !== undefined) q = q.eq('controlled_drug', controlled === 'true');
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch drugs' });
  }
}

export async function createDrug(req, res) {
  const { name, generic_name, dosage, category, controlled_drug, requires_prescription, unit, min_stock_quantity } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Drug name required' });
  try {
    const { data, error } = await req.supabase
      .from('drugs')
      .insert({
        name,
        generic_name: generic_name || null,
        dosage: dosage || null,
        category: category || null,
        controlled_drug: !!controlled_drug,
        requires_prescription: !!requires_prescription,
        unit: unit || 'pcs',
        min_stock_quantity: min_stock_quantity ?? 10,
      })
      .select()
      .single();
    if (error) throw error;

    await recordAuditEvent(req, {
      action: 'CREATE',
      resource: 'drug',
      resourceId: data.id,
      details: {
        name: data.name,
        generic_name: data.generic_name,
        dosage: data.dosage,
        category: data.category,
        controlled_drug: data.controlled_drug,
        requires_prescription: data.requires_prescription,
        min_stock_quantity: data.min_stock_quantity,
      },
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create drug' });
  }
}

export async function updateDrug(req, res) {
  const { id } = req.params;
  const body = req.body || {};
  try {
    const { data, error } = await req.supabase
      .from('drugs')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Drug not found' });

    await recordAuditEvent(req, {
      action: 'UPDATE',
      resource: 'drug',
      resourceId: data.id,
      details: {
        updated_fields: body,
      },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update drug' });
  }
}

export async function getBatches(req, res) {
  const { drug_id } = req.query;
  try {
    let q = req.supabase.from('inventory_batches').select('*, drugs(*)').order('expiry_date');
    if (drug_id) q = q.eq('drug_id', drug_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch batches' });
  }
}

// Active stock dashboard (aggregated by drug across batches with quantity > 0)
export async function getActiveStock(req, res) {
  try {
    const { data, error } = await req.supabase
      .from('inventory_batches')
      .select('drug_id, quantity, unit_price, expiry_date, drugs(name, category, min_stock_quantity)')
      .gt('quantity', 0)
      .order('expiry_date');
    if (error) throw error;

    const now = new Date();
    const nearExpiryDays = 90;
    const nearExpiryThreshold = new Date(now);
    nearExpiryThreshold.setDate(nearExpiryThreshold.getDate() + nearExpiryDays);
    const nearExpiryIso = nearExpiryThreshold.toISOString().slice(0, 10);

    const byDrug = {};
    for (const b of data || []) {
      const id = b.drug_id;
      if (!id) continue;
      const qty = parseInt(b.quantity, 10) || 0;
      const unitPrice = parseFloat(b.unit_price || 0);
      const expiry = b.expiry_date || null;

      if (!byDrug[id]) {
        byDrug[id] = {
          drug_id: id,
          drug_name: b.drugs?.name || 'Unknown',
          category: b.drugs?.category || null,
          min_stock_quantity: b.drugs?.min_stock_quantity ?? 0,
          quantity: 0,
          totalValue: 0,
          next_expiry: expiry,
        };
      }

      byDrug[id].quantity += qty;
      byDrug[id].totalValue += qty * unitPrice;
      if (expiry && (!byDrug[id].next_expiry || expiry < byDrug[id].next_expiry)) {
        byDrug[id].next_expiry = expiry;
      }
    }

    const rows = Object.values(byDrug).map((r) => {
      const avgPrice = r.quantity > 0 ? r.totalValue / r.quantity : 0;
      const lowStock = r.min_stock_quantity > 0 && r.quantity < r.min_stock_quantity;
      const nearExpiry = !!(r.next_expiry && r.next_expiry <= nearExpiryIso);
      return {
        drug_id: r.drug_id,
        drug_name: r.drug_name,
        category: r.category,
        quantity: r.quantity,
        price: avgPrice,
        expiry: r.next_expiry,
        lowStock,
        nearExpiry,
        min_stock_quantity: r.min_stock_quantity,
      };
    }).sort((a, b) => a.drug_name.localeCompare(b.drug_name));

    res.json({ nearExpiryDays, rows });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch active stock' });
  }
}

export async function addBatch(req, res) {
  const { drug_id, quantity, unit_price, batch_number, expiry_date, pharmacy_id } = req.body || {};
  if (!drug_id || quantity == null || !unit_price || !expiry_date) {
    return res.status(400).json({ error: 'drug_id, quantity, unit_price, expiry_date required' });
  }
  try {
    const profile = await getProfile(req);
    const pid = pharmacy_id ?? profile?.pharmacy_id;
    const { data, error } = await req.supabase
      .from('inventory_batches')
      .insert({
        drug_id,
        quantity: parseInt(quantity, 10),
        unit_price: parseFloat(unit_price),
        batch_number: batch_number || null,
        expiry_date,
        pharmacy_id: pid || null,
      })
      .select('*, drugs(*)')
      .single();
    if (error) throw error;

    await recordAuditEvent(req, {
      action: 'CREATE',
      resource: 'inventory_batch',
      resourceId: data.id,
      details: {
        drug_id: data.drug_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        batch_number: data.batch_number,
        expiry_date: data.expiry_date,
        pharmacy_id: data.pharmacy_id,
      },
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to add batch' });
  }
}

export async function updateBatch(req, res) {
  const { id } = req.params;
  const { quantity } = req.body || {};
  if (quantity == null) return res.status(400).json({ error: 'quantity required' });
  try {
    const { data, error } = await req.supabase
      .from('inventory_batches')
      .update({ quantity: parseInt(quantity, 10) })
      .eq('id', id)
      .select('*, drugs(*)')
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Batch not found' });

    await recordAuditEvent(req, {
      action: 'UPDATE',
      resource: 'inventory_batch',
      resourceId: data.id,
      details: {
        quantity: data.quantity,
      },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update batch' });
  }
}

export async function getAlerts(req, res) {
  try {
    const alerts = await fefoService.getAlerts(req.supabase, req.user.id);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch alerts' });
  }
}

async function getProfile(req) {
  const { data } = await supabaseAdmin.from('profiles').select('pharmacy_id').eq('id', req.user.id).single();
  return data;
}
