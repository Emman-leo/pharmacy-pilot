export async function overview(req, res) {
  try {
    const now = new Date();

    // Today range: [start of today, start of tomorrow)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const todayStartStr = todayStart.toISOString();
    const todayEndStr = todayEnd.toISOString();

    // This month from first day to now
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString();

    const [todayRes, monthRes, topRes, drugsRes, batchesRes] = await Promise.all([
      req.supabase
        .from('sales')
        .select('final_amount')
        .gte('sale_date', todayStartStr)
        .lt('sale_date', todayEndStr),
      req.supabase.from('sales').select('final_amount').gte('sale_date', monthStartStr),
      req.supabase.from('sale_items').select('drug_id, quantity, drugs(name)'),
      req.supabase.from('drugs').select('id, min_stock_quantity'),
      req.supabase
        .from('inventory_batches')
        .select('drug_id, quantity, unit_price')
        .gt('quantity', 0),
    ]);

    const todaySales = (todayRes.data || []).reduce(
      (s, r) => s + parseFloat(r.final_amount || 0),
      0
    );
    const monthSales = (monthRes.data || []).reduce(
      (s, r) => s + parseFloat(r.final_amount || 0),
      0
    );

    // Best-selling product (by quantity)
    const byDrug = {};
    for (const i of topRes.data || []) {
      const id = i.drug_id;
      if (!byDrug[id]) byDrug[id] = { drug_name: i.drugs?.name || 'Unknown', quantity: 0 };
      byDrug[id].quantity += parseInt(i.quantity, 10);
    }
    const best =
      Object.values(byDrug).sort((a, b) => b.quantity - a.quantity)[0] || {
        drug_name: '—',
        quantity: 0,
      };

    // Stock aggregates
    const stockByDrug = {};
    let totalStockValue = 0;
    for (const b of batchesRes.data || []) {
      const qty = b.quantity || 0;
      const unitPrice = parseFloat(b.unit_price || 0);
      totalStockValue += qty * unitPrice;
      stockByDrug[b.drug_id] = (stockByDrug[b.drug_id] || 0) + qty;
    }

    const activeProductIds = new Set(Object.keys(stockByDrug));
    const totalMedicines = (drugsRes.data || []).length;

    // Low stock: aggregated quantity below min_stock_quantity
    let lowStockCount = 0;
    for (const d of drugsRes.data || []) {
      const min = d.min_stock_quantity ?? 0;
      if (min <= 0) continue;
      const current = stockByDrug[d.id] || 0;
      if (current < min) lowStockCount += 1;
    }

    res.json({
      todaySales,
      monthSales,
      bestSelling: { name: best.drug_name, quantity: best.quantity },
      activeProductsCount: activeProductIds.size,
      totalMedicines,
      lowStockCount,
      totalStockValue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch overview' });
  }
}

export async function categoryDistribution(req, res) {
  const { start_date, end_date } = req.query;
  try {
    const rangeStart = start_date ? toStartOfDay(start_date) : null;
    const rangeEnd = end_date ? toEndOfDay(end_date) : null;
    let salesQ = req.supabase.from('sales').select('id');
    if (rangeStart) salesQ = salesQ.gte('sale_date', rangeStart);
    if (rangeEnd) salesQ = salesQ.lte('sale_date', rangeEnd);
    const { data: sales } = await salesQ;
    const saleIds = (sales || []).map((s) => s.id);
    if (saleIds.length === 0) {
      return res.json([]);
    }
    const { data: items } = await req.supabase
      .from('sale_items')
      .select('quantity, total_price, drugs(category)')
      .in('sale_id', saleIds);
    const byCategory = {};
    for (const i of items || []) {
      const cat = i.drugs?.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { category: cat, quantity: 0, amount: 0 };
      byCategory[cat].quantity += parseInt(i.quantity, 10);
      byCategory[cat].amount += parseFloat(i.total_price || 0);
    }
    res.json(Object.values(byCategory));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch category distribution' });
  }
}

/** Normalize end_date to end of day (23:59:59.999) so "today" includes full day. */
function toEndOfDay(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return `${dateStr}T23:59:59.999`;
}

/** Normalize start_date to start of day (00:00:00). */
function toStartOfDay(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return `${dateStr}T00:00:00.000`;
}

export async function salesSummary(req, res) {
  const { start_date, end_date } = req.query;
  try {
    const rangeStart = start_date ? toStartOfDay(start_date) : null;
    const rangeEnd = end_date ? toEndOfDay(end_date) : null;

    let q = req.supabase
      .from('sales')
      .select('id, final_amount, sale_date');
    if (rangeStart) q = q.gte('sale_date', rangeStart);
    if (rangeEnd) q = q.lte('sale_date', rangeEnd);
    const { data: salesData, error } = await q;
    if (error) throw error;

    const sales = salesData || [];
    const total = sales.reduce((s, r) => s + parseFloat(r.final_amount || 0), 0);
    const count = sales.length;
    const saleIds = sales.map((s) => s.id);

    if (saleIds.length === 0) {
      return res.json({ total: 0, count: 0, sales: [], items: [] });
    }

    const { data: itemsData, error: itemsError } = await req.supabase
      .from('sale_items')
      .select('drug_id, quantity, unit_price, total_price, drugs(name)')
      .in('sale_id', saleIds);
    if (itemsError) throw itemsError;

    const byDrug = {};
    for (const i of itemsData || []) {
      const id = i.drug_id;
      const qty = parseInt(i.quantity, 10) || 0;
      const amount = parseFloat(i.total_price || 0);
      if (!byDrug[id]) {
        byDrug[id] = { drug_id: id, drug_name: i.drugs?.name || 'Unknown', quantity: 0, amount: 0 };
      }
      byDrug[id].quantity += qty;
      byDrug[id].amount += amount;
    }
    const items = Object.values(byDrug)
      .map((row) => ({
        drug_id: row.drug_id,
        drug_name: row.drug_name,
        quantity: row.quantity,
        unit_price: row.quantity > 0 ? row.amount / row.quantity : 0,
        amount: row.amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    res.json({ total, count, sales, items });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch sales summary' });
  }
}

export async function topSelling(req, res) {
  const { limit = 10 } = req.query;
  try {
    const { data: items, error } = await req.supabase
      .from('sale_items')
      .select('drug_id, quantity, drugs(name)');
    if (error) throw error;

    const byDrug = {};
    for (const i of items || []) {
      const id = i.drug_id;
      if (!byDrug[id]) byDrug[id] = { drug_id: id, drug_name: i.drugs?.name || 'Unknown', quantity: 0 };
      byDrug[id].quantity += parseInt(i.quantity, 10);
    }
    const top = Object.values(byDrug)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, parseInt(limit, 10));
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch top selling' });
  }
}

export async function expiryAlerts(req, res) {
  const { days = 90 } = req.query;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + parseInt(days, 10));
  try {
    const { data, error } = await req.supabase
      .from('inventory_batches')
      .select('*, drugs(name, dosage)')
      .lte('expiry_date', threshold.toISOString().slice(0, 10))
      .gt('quantity', 0)
      .order('expiry_date');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch expiry alerts' });
  }
}

export async function profitMargin(req, res) {
  const { start_date, end_date } = req.query;
  try {
    const rangeStart = start_date ? toStartOfDay(start_date) : null;
    const rangeEnd = end_date ? toEndOfDay(end_date) : null;
    let salesFilter = req.supabase.from('sales').select('id');
    if (rangeStart) salesFilter = salesFilter.gte('sale_date', rangeStart);
    if (rangeEnd) salesFilter = salesFilter.lte('sale_date', rangeEnd);
    const { data: sales } = await salesFilter;
    const saleIds = (sales || []).map((s) => s.id);
    if (saleIds.length === 0) {
      return res.json({ items: [], totalRevenue: 0, totalCost: 0, totalProfit: 0 });
    }

    const { data: items, error } = await req.supabase
      .from('sale_items')
      .select('sale_id, drug_id, quantity, unit_price, total_price, batch_id, drugs(name)')
      .in('sale_id', saleIds);
    if (error) throw error;

    const batchIds = [...new Set((items || []).map((i) => i.batch_id).filter(Boolean))];
    const batches = batchIds.length
      ? await req.supabase.from('inventory_batches').select('id, unit_price').in('id', batchIds).then((r) => r.data || [])
      : [];
    const batchCost = batches.reduce((m, b) => ({ ...m, [b.id]: parseFloat(b.unit_price) }), {});

    const byDrug = {};
    for (const i of items || []) {
      const id = i.drug_id;
      if (!byDrug[id]) byDrug[id] = { drug_id: id, drug_name: i.drugs?.name || 'Unknown', revenue: 0, cost: 0 };
      byDrug[id].revenue += parseFloat(i.total_price || 0);
      const costPer = i.batch_id ? batchCost[i.batch_id] : 0;
      byDrug[id].cost += (costPer || 0) * parseInt(i.quantity, 10);
    }
    const result = Object.values(byDrug).map((r) => ({
      ...r,
      profit: r.revenue - r.cost,
      margin_pct: r.revenue ? (((r.revenue - r.cost) / r.revenue) * 100).toFixed(1) : 0,
    }));
    const totalRevenue = result.reduce((s, r) => s + r.revenue, 0);
    const totalCost = result.reduce((s, r) => s + r.cost, 0);
    res.json({ items: result, totalRevenue, totalCost, totalProfit: totalRevenue - totalCost });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch profit margin' });
  }
}

export async function salesByPeriod(req, res) {
  const { start_date, end_date, group = 'day' } = req.query;
  try {
    const rangeStart = start_date ? toStartOfDay(start_date) : null;
    const rangeEnd = end_date ? toEndOfDay(end_date) : null;
    let q = req.supabase.from('sales').select('id, sale_date, final_amount');
    if (rangeStart) q = q.gte('sale_date', rangeStart);
    if (rangeEnd) q = q.lte('sale_date', rangeEnd);
    const { data: sales, error } = await q;
    if (error) throw error;

    const buckets = {};
    const fmt = group === 'month' ? (d) => d.slice(0, 7) : group === 'week' ? (d) => {
      const date = new Date(d);
      const start = new Date(date);
      start.setDate(start.getDate() - start.getDay());
      return start.toISOString().slice(0, 10);
    } : (d) => d.slice(0, 10);

    for (const s of sales || []) {
      const key = fmt(s.sale_date);
      if (!buckets[key]) buckets[key] = { period: key, total: 0, count: 0 };
      buckets[key].total += parseFloat(s.final_amount || 0);
      buckets[key].count += 1;
    }
    const result = Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch sales by period' });
  }
}

export async function inventoryValuation(req, res) {
  try {
    const { data, error } = await req.supabase
      .from('inventory_batches')
      .select('quantity, unit_price, drug_id, drugs(name)')
      .gt('quantity', 0);
    if (error) throw error;

    const byDrug = {};
    let total = 0;
    for (const b of data || []) {
      const val = b.quantity * parseFloat(b.unit_price || 0);
      total += val;
      const id = b.drug_id;
      if (!byDrug[id]) byDrug[id] = { drug_id: id, drug_name: b.drugs?.name || 'Unknown', quantity: 0, value: 0 };
      byDrug[id].quantity += b.quantity;
      byDrug[id].value += val;
    }
    res.json({ total, byDrug: Object.values(byDrug).sort((a, b) => b.value - a.value) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch inventory valuation' });
  }
}

export async function slowMoving(req, res) {
  const { days = 90 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - parseInt(days, 10));
  try {
    const { data: sales } = await req.supabase.from('sales').select('id').gte('sale_date', since.toISOString());
    const saleIds = (sales || []).map((s) => s.id);
    if (saleIds.length === 0) {
      const { data: drugs } = await req.supabase.from('drugs').select('id, name');
      return res.json((drugs || []).map((d) => ({ drug_id: d.id, drug_name: d.name, quantity_sold: 0 })));
    }
    const { data: items } = await req.supabase.from('sale_items').select('drug_id, quantity').in('sale_id', saleIds);

    const sold = {};
    for (const i of items || []) {
      sold[i.drug_id] = (sold[i.drug_id] || 0) + parseInt(i.quantity, 10);
    }

    const { data: drugs } = await req.supabase.from('drugs').select('id, name');
    const result = (drugs || []).map((d) => ({
      drug_id: d.id,
      drug_name: d.name,
      quantity_sold: sold[d.id] || 0,
    })).filter((r) => r.quantity_sold <= 5).sort((a, b) => a.quantity_sold - b.quantity_sold);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch slow-moving items' });
  }
}
