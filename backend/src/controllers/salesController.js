import { fefoService } from '../services/fefoService.js';
import { supabaseAdmin } from '../utils/db.js';
import { recordAuditEvent } from '../utils/auditLogger.js';

export async function estimate(req, res) {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ total: 0, items: [] });
  }
  try {
    const profile = await getProfile(req);
    const pharmacy_id = profile?.pharmacy_id || null;
    let total = 0;
    const breakdown = [];
    for (const item of items) {
      const { drug_id, quantity } = item;
      if (!drug_id || !quantity || quantity < 1) continue;
      const allocation = await fefoService.allocateBatch(req.supabase, drug_id, quantity, pharmacy_id);
      if (!allocation) {
        return res.status(400).json({ error: `Insufficient stock for drug ${drug_id}`, drug_id });
      }
      for (const a of allocation.allocations) {
        const lineTotal = a.quantity * a.unit_price;
        total += lineTotal;
        breakdown.push({ drug_id, quantity: a.quantity, unit_price: a.unit_price, total: lineTotal });
      }
    }
    res.json({ total, breakdown });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Estimate failed' });
  }
}

export async function checkout(req, res) {
  const { items, customer_name, discount_amount = 0 } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart items required' });
  }
  try {
    const profile = await getProfile(req);
    const pharmacy_id = profile?.pharmacy_id || null;

    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let totalAmount = 0;
    const saleItems = [];

    for (const item of items) {
      const { drug_id, quantity } = item;
      if (!drug_id || !quantity || quantity < 1) continue;

      const allocation = await fefoService.allocateBatch(req.supabase, drug_id, quantity, pharmacy_id);
      if (!allocation || allocation.allocations.length === 0) {
        return res.status(400).json({
          error: `Insufficient stock for drug ${drug_id}`,
          drug_id,
        });
      }

      for (const a of allocation.allocations) {
        const lineTotal = a.quantity * a.unit_price;
        totalAmount += lineTotal;
        saleItems.push({
          drug_id,
          batch_id: a.batch_id,
          quantity: a.quantity,
          unit_price: a.unit_price,
          total_price: lineTotal,
        });
      }
    }

    const discount = parseFloat(discount_amount) || 0;
    const finalAmount = Math.max(0, totalAmount - discount);

    const { data: sale, error: saleError } = await req.supabase
      .from('sales')
      .insert({
        pharmacy_id,
        receipt_number: receiptNumber,
        total_amount: totalAmount,
        discount_amount: discount,
        final_amount: finalAmount,
        sold_by: req.user.id,
        customer_name: customer_name || null,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    for (const si of saleItems) {
      await req.supabase.from('sale_items').insert({
        ...si,
        sale_id: sale.id,
      });
      await fefoService.deductFromBatches(req.supabase, [si]);
    }

    const { data: fullSale } = await req.supabase
      .from('sales')
      .select('*, sale_items(*, drugs(*))')
      .eq('id', sale.id)
      .single();

    const result = fullSale || sale;

    await recordAuditEvent(req, {
      action: 'CHECKOUT',
      resource: 'sale',
      resourceId: sale.id,
      details: {
        receipt_number: sale.receipt_number,
        total_amount: sale.total_amount,
        discount_amount: sale.discount_amount,
        final_amount: sale.final_amount,
        items_count: saleItems.length,
      },
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Checkout failed' });
  }
}

export async function getHistory(req, res) {
  const { limit = 50, offset = 0 } = req.query;
  try {
    const { data, error } = await req.supabase
      .from('sales')
      .select('*, sale_items(*, drugs(*))')
      .order('sale_date', { ascending: false })
      .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch sales' });
  }
}

export async function getReceipt(req, res) {
  const { id } = req.params;
  try {
    const { data, error } = await req.supabase
      .from('sales')
      .select('*, sale_items(*, drugs(*)), pharmacies(name, address, phone)')
      .eq('id', id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Receipt not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch receipt' });
  }
}

export async function voidSale(req, res) {
  const { id } = req.params;
  try {
    const profile = await getProfile(req);
    const pharmacy_id = profile?.pharmacy_id || null;

    const { data: sale, error } = await supabaseAdmin
      .from('sales')
      .select('*, sale_items(*)')
      .eq('id', id)
      .single();
    if (error || !sale) return res.status(404).json({ error: 'Sale not found' });

    if (sale.status === 'VOIDED') {
      return res.status(400).json({ error: 'Sale already voided' });
    }

    if (pharmacy_id && sale.pharmacy_id && sale.pharmacy_id !== pharmacy_id) {
      return res.status(403).json({ error: 'Not allowed to void this sale' });
    }

    const items = sale.sale_items || [];
    for (const item of items) {
      if (!item.batch_id || !item.quantity) continue;
      const { data: batch, error: batchError } = await supabaseAdmin
        .from('inventory_batches')
        .select('quantity')
        .eq('id', item.batch_id)
        .single();
      if (batchError) throw batchError;
      const newQty = (batch?.quantity || 0) + item.quantity;
      const { error: updateError } = await supabaseAdmin
        .from('inventory_batches')
        .update({ quantity: newQty })
        .eq('id', item.batch_id);
      if (updateError) throw updateError;
    }

    const { data: updated, error: updateSaleError } = await supabaseAdmin
      .from('sales')
      .update({ status: 'VOIDED' })
      .eq('id', id)
      .select()
      .single();
    if (updateSaleError) throw updateSaleError;

    await recordAuditEvent(req, {
      action: 'CHECKOUT_VOID',
      resource: 'sale',
      resourceId: id,
      details: {
        receipt_number: sale.receipt_number,
        total_amount: sale.total_amount,
        discount_amount: sale.discount_amount,
        final_amount: sale.final_amount,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to void sale' });
  }
}

async function getProfile(req) {
  const { data } = await supabaseAdmin.from('profiles').select('pharmacy_id').eq('id', req.user.id).single();
  return data;
}
