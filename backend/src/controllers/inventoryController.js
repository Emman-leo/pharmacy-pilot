import { supabaseAdmin } from '../utils/db.js';
import { fefoService } from '../services/fefoService.js';
import { recordAuditEvent } from '../utils/auditLogger.js';
import { getProfile } from '../utils/profileUtils.js';

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
  const { name, generic_name, dosage, category, controlled_drug, requires_prescription, unit, min_stock_quantity, pharmacy_id: bodyPharmacyId } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Drug name required' });
  try {
    const profile = await getProfile(req);
    const isAdmin = req.userRole === 'ADMIN';
    const pharmacy_id = isAdmin && bodyPharmacyId !== undefined ? bodyPharmacyId : (profile?.pharmacy_id ?? null);

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
        pharmacy_id,
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
  const {
    name, generic_name, dosage, category,
    controlled_drug, requires_prescription,
    unit, min_stock_quantity,
  } = req.body || {};

  // Build a clean object — only known safe fields
  const allowedUpdates = {};
  if (name !== undefined)                   allowedUpdates.name = name;
  if (generic_name !== undefined)           allowedUpdates.generic_name = generic_name;
  if (dosage !== undefined)                 allowedUpdates.dosage = dosage;
  if (category !== undefined)               allowedUpdates.category = category;
  if (controlled_drug !== undefined)        allowedUpdates.controlled_drug = !!controlled_drug;
  if (requires_prescription !== undefined)  allowedUpdates.requires_prescription = !!requires_prescription;
  if (unit !== undefined)                   allowedUpdates.unit = unit;
  if (min_stock_quantity !== undefined)     allowedUpdates.min_stock_quantity = min_stock_quantity;

  if (Object.keys(allowedUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const { data, error } = await req.supabase
      .from('drugs')
      .update(allowedUpdates)
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
        updated_fields: allowedUpdates,
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
      .select('drug_id, quantity, cost_price, selling_price, expiry_date, drugs(name, category, min_stock_quantity)')
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
      const costPrice = parseFloat(b.cost_price || 0);
      const sellingPrice = parseFloat(b.selling_price || 0);
      const expiry = b.expiry_date || null;

      if (!byDrug[id]) {
        byDrug[id] = {
          drug_id: id,
          drug_name: b.drugs?.name || 'Unknown',
          category: b.drugs?.category || null,
          min_stock_quantity: b.drugs?.min_stock_quantity ?? 0,
          quantity: 0,
          totalValue: 0,
          totalSellingValue: 0,
          selling_price: sellingPrice,
          next_expiry: expiry,
        };
      }

      byDrug[id].quantity += qty;
      byDrug[id].totalValue += qty * costPrice;
      byDrug[id].totalSellingValue += qty * sellingPrice;
      if (expiry && (!byDrug[id].next_expiry || expiry < byDrug[id].next_expiry)) {
        byDrug[id].next_expiry = expiry;
      }
    }

    const rows = Object.values(byDrug).map((r) => {
      const avgCost = r.quantity > 0 ? r.totalValue / r.quantity : 0;
      const lowStock = r.min_stock_quantity > 0 && r.quantity < r.min_stock_quantity;
      const nearExpiry = !!(r.next_expiry && r.next_expiry <= nearExpiryIso);
      return {
        drug_id: r.drug_id,
        drug_name: r.drug_name,
        category: r.category,
        quantity: r.quantity,
        cost_price: avgCost,
        selling_price: r.selling_price,
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
  const { drug_id, quantity, cost_price, selling_price, batch_number, expiry_date, pharmacy_id, supplier_id, supplier_invoice } = req.body || {};
  if (!drug_id || quantity == null || !cost_price || !selling_price || !expiry_date) {
    return res.status(400).json({ error: 'drug_id, quantity, cost_price, selling_price, expiry_date required' });
  }
  try {
    const profile = await getProfile(req);
    const pid = pharmacy_id ?? profile?.pharmacy_id;
    const { data, error } = await req.supabase
      .from('inventory_batches')
      .insert({
        drug_id,
        quantity: parseInt(quantity, 10),
        cost_price: parseFloat(cost_price),
        selling_price: parseFloat(selling_price),
        batch_number: batch_number || null,
        expiry_date,
        pharmacy_id: pid || null,
        supplier_id: supplier_id || null,
        supplier_invoice: supplier_invoice?.trim() || null,
        received_quantity: parseInt(quantity, 10),
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
        cost_price: data.cost_price,
        selling_price: data.selling_price,
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
  const { quantity, cost_price, selling_price } = req.body || {};
  if (quantity == null && cost_price == null && selling_price == null) {
    return res.status(400).json({ error: 'At least one field (quantity, cost_price, selling_price) is required' });
  }
  try {
    const updates = {};
    if (quantity != null) updates.quantity = parseInt(quantity, 10);
    if (cost_price != null) updates.cost_price = parseFloat(cost_price);
    if (selling_price != null) updates.selling_price = parseFloat(selling_price);
    
    const { data, error } = await req.supabase
      .from('inventory_batches')
      .update(updates)
      .eq('id', id)
      .select('*, drugs(*)')
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Batch not found' });

    await recordAuditEvent(req, {
      action: 'UPDATE',
      resource: 'inventory_batch',
      resourceId: data.id,
      details: updates,
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

export async function getStockTally(req, res) {
  try {
    const { data, error } = await req.supabase
      .from('inventory_batches')
      .select('id, batch_number, quantity, received_quantity, cost_price, selling_price, expiry_date, supplier_invoice, supplier_id, drug_id, drugs(name), suppliers(name)')
      .order('expiry_date');
    if (error) throw error;

    const rows = (data || []).map((b) => ({
      batch_id: b.id,
      drug_name: b.drugs?.name || 'Unknown',
      supplier_name: b.suppliers?.name || '-',
      supplier_invoice: b.supplier_invoice || '-',
      batch_number: b.batch_number || '-',
      received: b.received_quantity ?? b.quantity,
      current_stock: b.quantity,
      sold: (b.received_quantity ?? b.quantity) - b.quantity,
      expiry: b.expiry_date || '-',
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch stock tally' });
  }
}

