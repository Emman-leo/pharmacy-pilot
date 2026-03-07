import { fefoService } from '../services/fefoService.js';
import { supabaseAdmin } from '../utils/db.js';
import { recordAuditEvent } from '../utils/auditLogger.js';
import { getProfile } from '../utils/profileUtils.js';

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
  const { items, customer_name, discount_amount = 0, payment_method } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty' });
  }

  // Validate each cart item
  for (const item of items) {
    if (!item.drug_id || typeof item.drug_id !== 'string') {
      return res.status(400).json({ error: 'Invalid drug_id in cart' });
    }
    const qty = parseInt(item.quantity, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 9999) {
      return res.status(400).json({ error: `Invalid quantity for drug ${item.drug_id}` });
    }
  }

  const discount = parseFloat(discount_amount);
  if (isNaN(discount) || discount < 0) {
    return res.status(400).json({ error: 'Discount amount must be a non-negative number' });
  }

  const validPaymentMethods = ['cash', 'momo', 'card'];
  if (!validPaymentMethods.includes(payment_method)) {
    return res.status(400).json({ error: `payment_method must be one of: ${validPaymentMethods.join(', ')}` });
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
        payment_method,
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
  const MAX_LIMIT = 200;
  const requestedLimit = parseInt(req.query.limit, 10) || 50;
  const limit = Math.min(requestedLimit, MAX_LIMIT); // never exceed 200 rows
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0); // no negative offsets
  
  try {
    const { data, error } = await req.supabase
      .from('sales')
      .select('*, sale_items(*, drugs(*))')
      .order('sale_date', { ascending: false })
      .range(offset, offset + limit - 1);
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
    // Step 1: fetch the sale first to verify ownership
    const profile = await getProfile(req);
    const pharmacy_id = profile?.pharmacy_id || null;

    const { data: sale, error: fetchError } = await supabaseAdmin
      .from('sales')
      .select('id, status, pharmacy_id')
      .eq('id', id)
      .single();

    if (fetchError || !sale) {
      if (fetchError?.message.includes('No rows returned')) {
        return res.status(404).json({ error: 'Sale not found' });
      }
      throw fetchError;
    }

    // Step 2: enforce pharmacy isolation before touching data
    if (pharmacy_id && sale.pharmacy_id && sale.pharmacy_id !== pharmacy_id) {
      return res.status(403).json({ error: 'Not allowed to void this sale' });
    }

    // Step 3: now it is safe to call the atomic void RPC
    const { error: rpcError } = await supabaseAdmin.rpc('void_sale', { p_sale_id: id });
    if (rpcError) {
      if (rpcError.message.includes('already voided')) {
        return res.status(400).json({ error: 'Sale already voided' });
      }
      if (rpcError.message.includes('Inventory batch not found')) {
        return res.status(500).json({ error: 'Inventory batch error during void' });
      }
      throw rpcError;
    }

    // Step 4: fetch updated sale for audit log + response
    const { data: updated, error: updatedError } = await supabaseAdmin
      .from('sales')
      .select('id, status, receipt_number, total_amount, discount_amount, final_amount, pharmacy_id')
      .eq('id', id)
      .single();
    if (updatedError) throw updatedError;

    // Step 5: audit log
    await recordAuditEvent(req, {
      action: 'CHECKOUT_VOID',
      resource: 'sale',
      resourceId: id,
      details: {
        receipt_number: updated.receipt_number,
        total_amount: updated.total_amount,
        discount_amount: updated.discount_amount,
        final_amount: updated.final_amount,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to void sale' });
  }
}

