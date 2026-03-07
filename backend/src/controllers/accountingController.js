import { supabaseAdmin } from '../utils/db.js';
import { recordAuditEvent } from '../utils/auditLogger.js';

async function getProfile(req) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('pharmacy_id')
    .eq('id', req.user.id)
    .single();
  return data;
}

// ── Expenses ────────────────────────────────────────────────

export async function createExpense(req, res) {
  const {
    amount, category, payment_method, description,
    expense_date, staff_id, staff_name, receipt_url,
  } = req.body || {};

  if (!amount || !category || !payment_method) {
    return res.status(400).json({ error: 'amount, category, and payment_method are required' });
  }

  try {
    const profile = await getProfile(req);
    const pharmacy_id = profile?.pharmacy_id || null;

    const { data, error } = await req.supabase
      .from('expenses')
      .insert({
        pharmacy_id,
        amount:         parseFloat(amount),
        category,
        payment_method,
        description:    description || null,
        expense_date:   expense_date || new Date().toISOString().slice(0, 10),
        staff_id:       staff_id || null,
        staff_name:     staff_name || null,
        receipt_url:    receipt_url || null,
        recorded_by:    req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await recordAuditEvent(req, {
      action:     'CREATE',
      resource:   'expense',
      resourceId: data.id,
      details:    { amount: data.amount, category: data.category, payment_method: data.payment_method },
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create expense' });
  }
}

export async function listExpenses(req, res) {
  const { start_date, end_date, category, limit = 100, offset = 0 } = req.query;
  try {
    let q = req.supabase
      .from('expenses')
      .select('*, profiles(full_name, email)')
      .order('expense_date', { ascending: false })
      .order('created_at',   { ascending: false })
      .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

    if (start_date) q = q.gte('expense_date', start_date);
    if (end_date)   q = q.lte('expense_date', end_date);
    if (category)   q = q.eq('category', category);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch expenses' });
  }
}

export async function deleteExpense(req, res) {
  const { id } = req.params;
  try {
    const { error } = await req.supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await recordAuditEvent(req, {
      action:     'DELETE',
      resource:   'expense',
      resourceId: id,
      details:    {},
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete expense' });
  }
}

// ── Daily Close ─────────────────────────────────────────────

export async function getDailyClosePreview(req, res) {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const profile     = await getProfile(req);
    const pharmacy_id = profile?.pharmacy_id || null;

    // Check if already closed
    const { data: existing } = await req.supabase
      .from('daily_closes')
      .select('*')
      .eq('close_date', date)
      .maybeSingle();

    if (existing) {
      return res.json({ ...existing, already_closed: true });
    }

    const dayStart = `${date}T00:00:00.000`;
    const dayEnd   = `${date}T23:59:59.999`;

    // Sales for the day
    const { data: sales } = await req.supabase
      .from('sales')
      .select('final_amount, payment_method')
      .neq('status', 'VOIDED')
      .gte('sale_date', dayStart)
      .lte('sale_date', dayEnd);

    const cash_sales = (sales || [])
      .filter(s => s.payment_method === 'cash')
      .reduce((sum, s) => sum + parseFloat(s.final_amount || 0), 0);

    const momo_sales = (sales || [])
      .filter(s => s.payment_method === 'momo')
      .reduce((sum, s) => sum + parseFloat(s.final_amount || 0), 0);

    const total_sales = cash_sales + momo_sales;

    // Expenses for the day
    const { data: expenseRows } = await req.supabase
      .from('expenses')
      .select('amount, payment_method')
      .eq('expense_date', date);

    const total_expenses_cash = (expenseRows || [])
      .filter(e => e.payment_method === 'cash')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const total_expenses_momo = (expenseRows || [])
      .filter(e => e.payment_method === 'momo')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const expected_cash = cash_sales - total_expenses_cash;

    res.json({
      close_date:          date,
      cash_sales,
      momo_sales,
      total_sales,
      total_expenses_cash,
      total_expenses_momo,
      expected_cash,
      already_closed:      false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to compute daily close preview' });
  }
}

export async function submitDailyClose(req, res) {
  const { date, actual_cash, notes } = req.body || {};

  if (!date || actual_cash == null) {
    return res.status(400).json({ error: 'date and actual_cash are required' });
  }

  try {
    const profile     = await getProfile(req);
    const pharmacy_id = profile?.pharmacy_id || null;

    // Prevent double-close
    const { data: existing } = await req.supabase
      .from('daily_closes')
      .select('id')
      .eq('close_date', date)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: `${date} has already been closed` });
    }

    // Re-compute expected figures server-side (don't trust client)
    const dayStart = `${date}T00:00:00.000`;
    const dayEnd   = `${date}T23:59:59.999`;

    const { data: sales } = await req.supabase
      .from('sales')
      .select('final_amount, payment_method')
      .neq('status', 'VOIDED')
      .gte('sale_date', dayStart)
      .lte('sale_date', dayEnd);

    const cash_sales = (sales || [])
      .filter(s => s.payment_method === 'cash')
      .reduce((sum, s) => sum + parseFloat(s.final_amount || 0), 0);

    const momo_sales = (sales || [])
      .filter(s => s.payment_method === 'momo')
      .reduce((sum, s) => sum + parseFloat(s.final_amount || 0), 0);

    const { data: expenseRows } = await req.supabase
      .from('expenses')
      .select('amount, payment_method')
      .eq('expense_date', date);

    const total_expenses_cash = (expenseRows || [])
      .filter(e => e.payment_method === 'cash')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const total_expenses_momo = (expenseRows || [])
      .filter(e => e.payment_method === 'momo')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const expected_cash = cash_sales - total_expenses_cash;
    const discrepancy   = parseFloat(actual_cash) - expected_cash;

    const { data, error } = await req.supabase
      .from('daily_closes')
      .insert({
        pharmacy_id,
        close_date:          date,
        cash_sales,
        momo_sales,
        total_sales:         cash_sales + momo_sales,
        total_expenses_cash,
        total_expenses_momo,
        expected_cash,
        actual_cash:         parseFloat(actual_cash),
        discrepancy,
        notes:               notes || null,
        closed_by:           req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await recordAuditEvent(req, {
      action:     'DAILY_CLOSE',
      resource:   'daily_close',
      resourceId: data.id,
      details:    { date, discrepancy, actual_cash: parseFloat(actual_cash) },
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to submit daily close' });
  }
}

export async function getDailyCloseHistory(req, res) {
  const { limit = 30, offset = 0 } = req.query;
  try {
    const { data, error } = await req.supabase
      .from('daily_closes')
      .select('*')
      .order('close_date', { ascending: false })
      .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch daily close history' });
  }
}

// ── P&L ─────────────────────────────────────────────────────

export async function getProfitAndLoss(req, res) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().slice(0, 10);
  const defaultEnd = now.toISOString().slice(0, 10);

  const start_date = req.query.start_date || defaultStart;
  const end_date   = req.query.end_date   || defaultEnd;

  const rangeStart = `${start_date}T00:00:00.000`;
  const rangeEnd   = `${end_date}T23:59:59.999`;

  try {
    // Revenue
    const { data: salesData } = await req.supabase
      .from('sales')
      .select('id, final_amount')
      .neq('status', 'VOIDED')
      .gte('sale_date', rangeStart)
      .lte('sale_date', rangeEnd);

    const revenue  = (salesData || [])
      .reduce((s, r) => s + parseFloat(r.final_amount || 0), 0);
    const saleIds  = (salesData || []).map(s => s.id);

    // COGS — sale items joined to batch purchase prices
    let cogs = 0;
    if (saleIds.length > 0) {
      const { data: itemsData } = await req.supabase
        .from('sale_items')
        .select('quantity, batch_id')
        .in('sale_id', saleIds);

      const batchIds = [...new Set(
        (itemsData || []).map(i => i.batch_id).filter(Boolean)
      )];

      let batchPrices = {};
      if (batchIds.length > 0) {
        const { data: batches } = await req.supabase
          .from('inventory_batches')
          .select('id, unit_price')
          .in('id', batchIds);
        batchPrices = (batches || []).reduce((m, b) => {
          m[b.id] = parseFloat(b.unit_price || 0);
          return m;
        }, {});
      }

      cogs = (itemsData || []).reduce((sum, item) => {
        const price = batchPrices[item.batch_id] || 0;
        return sum + (parseInt(item.quantity, 10) * price);
      }, 0);
    }

    const grossProfit  = revenue - cogs;
    const grossMargin  = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // Expenses by category
    const { data: expenseData } = await req.supabase
      .from('expenses')
      .select('amount, category')
      .gte('expense_date', start_date)
      .lte('expense_date', end_date);

    const byCategory = {};
    let totalExpenses = 0;

    for (const e of expenseData || []) {
      const amt = parseFloat(e.amount || 0);
      totalExpenses += amt;
      if (!byCategory[e.category]) {
        byCategory[e.category] = 0;
      }
      byCategory[e.category] += amt;
    }

    const expenseBreakdown = Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount,
    })).sort((a, b) => b.amount - a.amount);

    const netProfit = grossProfit - totalExpenses;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    res.json({
      period: { start_date, end_date },
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      totalExpenses,
      expenseBreakdown,
      netProfit,
      netMargin,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to compute P&L' });
  }
}
