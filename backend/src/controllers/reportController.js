export async function salesSummary(req, res) {
  const { start_date, end_date } = req.query;
  try {
    let q = req.supabase
      .from('sales')
      .select('final_amount, sale_date');
    if (start_date) q = q.gte('sale_date', start_date);
    if (end_date) q = q.lte('sale_date', end_date);
    const { data, error } = await q;
    if (error) throw error;

    const total = (data || []).reduce((s, r) => s + parseFloat(r.final_amount || 0), 0);
    const count = (data || []).length;
    res.json({ total, count, sales: data });
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
