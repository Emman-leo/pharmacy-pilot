import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import BatchForm from './BatchForm';
import './InventoryPage.css';

function money(v) {
  const n = Number(v || 0);
  return `₵${n.toFixed(2)}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const ms = d.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function InventoryPage() {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [nearExpiryDays, setNearExpiryDays] = useState(90);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [view, setView] = useState('all'); // all | low | expiry
  const [showAddStock, setShowAddStock] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/inventory/active-stock');
      setRows(res.rows || []);
      setNearExpiryDays(res.nearExpiryDays ?? 90);
    } catch (e) {
      setError(e.message || 'Failed to load inventory');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    for (const r of rows) {
      if (r.category) set.add(r.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter((r) => {
      if (q && !String(r.drug_name || '').toLowerCase().includes(q)) return false;
      if (category && (r.category || '') !== category) return false;
      if (view === 'low' && !r.lowStock) return false;
      if (view === 'expiry' && !r.nearExpiry) return false;
      return true;
    });
  }, [rows, query, category, view]);

  const counts = useMemo(() => {
    const low = (rows || []).filter((r) => r.lowStock).length;
    const exp = (rows || []).filter((r) => r.nearExpiry).length;
    return { low, exp, all: (rows || []).length };
  }, [rows]);

  return (
    <div className="inventory-page">
      <header className="inventory-header">
        <div>
          <h1>Inventory</h1>
          <p className="inventory-subtitle">
            Active stock overview, with low-stock and near-expiry indicators.
          </p>
        </div>
        <div className="inventory-header-actions">
          <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddStock((s) => !s)}
          >
            {showAddStock ? 'Hide Add Stock' : 'Add Stock'}
          </button>
        </div>
      </header>

      {showAddStock && (
        <section className="inventory-add-stock">
          <div className="inventory-section-title">
            <h2>Add Stock</h2>
            <p>Add new batches and keep stock up to date (FEFO).</p>
          </div>
          <BatchForm embedded onStockChanged={load} />
        </section>
      )}

      <section className="inventory-filters">
        <input
          className="inventory-search"
          placeholder="Search drug name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="inventory-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="inventory-pills" role="tablist" aria-label="Inventory views">
          <button
            type="button"
            className={view === 'all' ? 'pill active' : 'pill'}
            onClick={() => setView('all')}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            className={view === 'low' ? 'pill active' : 'pill'}
            onClick={() => setView('low')}
          >
            Low stock ({counts.low})
          </button>
          <button
            type="button"
            className={view === 'expiry' ? 'pill active' : 'pill'}
            onClick={() => setView('expiry')}
          >
            Near expiry ({counts.exp})
          </button>
        </div>
      </section>

      {error && <p className="inventory-error">{error}</p>}

      <section className="inventory-table-section">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="inventory-empty">No matching items.</td>
                  </tr>
                )}
                {filtered.map((r) => {
                  const d = daysUntil(r.expiry);
                  const expiryClass =
                    r.nearExpiry ? (d != null && d <= 30 ? 'expiry-soon' : 'expiry-warn') : '';
                  return (
                    <tr key={r.drug_id}>
                      <td className="drug-cell">
                        <span className="drug-name">{r.drug_name}</span>
                        <span className="drug-badges">
                          {r.lowStock && (
                            <span className="badge badge-low" title={`Below min (${r.min_stock_quantity})`}>
                              Low
                            </span>
                          )}
                          {r.nearExpiry && (
                            <span className="badge badge-exp" title={`Expiring within ${nearExpiryDays} days`}>
                              Exp
                            </span>
                          )}
                        </span>
                        {r.category && <span className="drug-meta">{r.category}</span>}
                      </td>
                      <td className={r.lowStock ? 'qty-cell qty-low' : 'qty-cell'}>{r.quantity}</td>
                      <td>{money(r.price)}</td>
                      <td className={expiryClass}>
                        {r.expiry || '—'}
                        {d != null && d >= 0 && (
                          <span className="expiry-days"> ({d}d)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

