/**
 * FEFO (First Expiry, First Out) Service
 * Allocates inventory batches by expiry date; FIFO when expiry dates equal.
 */
import { supabaseAdmin } from '../utils/db.js';

export const fefoService = {
  async allocateBatch(supabase, drugId, quantity, pharmacyId) {
    let q = supabase
      .from('inventory_batches')
      .select('*')
      .eq('drug_id', drugId)
      .gt('quantity', 0)
      .gte('expiry_date', new Date().toISOString().slice(0, 10))
      .order('expiry_date', { ascending: true })
      .order('received_at', { ascending: true });

    if (pharmacyId) {
      q = q.or(`pharmacy_id.eq.${pharmacyId},pharmacy_id.is.null`);
    }
    const { data: batches, error } = await q;
    if (error) throw error;

    let remaining = parseInt(quantity, 10);
    const allocations = [];

    for (const batch of batches || []) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, batch.quantity);
      allocations.push({
        batch_id: batch.id,
        quantity: take,
        unit_price: parseFloat(batch.unit_price),
      });
      remaining -= take;
    }

    if (remaining > 0) return null;
    return { allocations };
  },

  async deductFromBatches(supabase, allocations) {
    for (const a of allocations) {
      const { data: batch } = await supabase
        .from('inventory_batches')
        .select('quantity')
        .eq('id', a.batch_id)
        .single();
      const newQty = (batch?.quantity || 0) - a.quantity;
      await supabase
        .from('inventory_batches')
        .update({ quantity: newQty })
        .eq('id', a.batch_id);
    }
  },

  async getAlerts(supabase, userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', userId)
      .single();

    const pharmacyId = profile?.pharmacy_id;
    const lowStock = [];
    const expiryWarnings = [];

    let batchQuery = supabase
      .from('inventory_batches')
      .select('*, drugs(name, min_stock_quantity)')
      .gt('quantity', 0);

    if (pharmacyId) {
      batchQuery = batchQuery.or(`pharmacy_id.eq.${pharmacyId},pharmacy_id.is.null`);
    }

    const { data: batches } = await batchQuery;
    const byDrug = {};

    for (const b of batches || []) {
      const did = b.drug_id;
      if (!byDrug[did]) byDrug[did] = { total: 0, min: b.drugs?.min_stock_quantity ?? 10, drug_name: b.drugs?.name };
      byDrug[did].total += b.quantity;
    }

    for (const [id, d] of Object.entries(byDrug)) {
      if (d.total < d.min) lowStock.push({ drug_id: id, drug_name: d.drug_name, current: d.total, min: d.min });
    }

    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 90);
    let expQ = supabase
      .from('inventory_batches')
      .select('*, drugs(name)')
      .lte('expiry_date', threshold.toISOString().slice(0, 10))
      .gt('quantity', 0);
    if (pharmacyId) expQ = expQ.or(`pharmacy_id.eq.${pharmacyId},pharmacy_id.is.null`);
    const { data: expiring } = await expQ;

    for (const b of expiring || []) {
      expiryWarnings.push({
        batch_id: b.id,
        drug_name: b.drugs?.name,
        expiry_date: b.expiry_date,
        quantity: b.quantity,
      });
    }

    return { lowStock, expiryWarnings };
  },
};
