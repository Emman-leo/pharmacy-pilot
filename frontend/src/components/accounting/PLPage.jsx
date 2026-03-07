import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import './Accounting.css';

const fmt   = (n)   => `₵${Number(n || 0).toFixed(2)}`;
const pct   = (n)   => `${Number(n || 0).toFixed(1)}%`;
const label = (cat) => cat.charAt(0).toUpperCase() + cat.slice(1);

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function PLPage() {
  const api = useApi();

  const [startDate,  setStartDate]  = useState(firstOfMonth());
  const [endDate,    setEndDate]    = useState(todayStr());
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const fetchPL = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get(
        `/accounting/pl?start_date=${startDate}&end_date=${endDate}` 
      );
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load P&L');
    } finally {
      setLoading(false);
    }
  }, [api, startDate, endDate]);

  useEffect(() => { fetchPL(); }, [fetchPL]);

  const maxExpense = data
    ? Math.max(...(data.expenseBreakdown || []).map(e => e.amount), 1)
    : 1;

  return (
    <div className="accounting-page">
      <header className="accounting-header">
        <h1>Profit &amp; Loss</h1>
        <p className="accounting-subtitle">Financial summary for your pharmacy</p>
      </header>

      {/* Date range */}
      <div className="accounting-card pl-filter-row">
        <div className="form-group">
          <label>From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="acct-input"
          />
        </div>
        <div className="form-group">
          <label>To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="acct-input"
          />
        </div>
        <button
          type="button"
          className="btn btn-primary pl-filter-btn"
          onClick={fetchPL}
        >
          Apply
        </button>
      </div>

      {error && <div className="acct-error">{error}</div>}

      {loading ? (
        <p className="acct-loading">Computing P&amp;L…</p>
      ) : data ? (
        <>
          {/* Top summary cards */}
          <div className="pl-summary-grid">
            <div className="pl-card">
              <span className="pl-card-label">Revenue</span>
              <span className="pl-card-value">{fmt(data.revenue)}</span>
              <span className="pl-card-sub">Total sales</span>
            </div>
            <div className="pl-card">
              <span className="pl-card-label">Cost of Goods</span>
              <span className="pl-card-value negative">{fmt(data.cogs)}</span>
              <span className="pl-card-sub">Purchase cost of items sold</span>
            </div>
            <div className={`pl-card pl-card-highlight ${data.grossProfit >= 0 ? 'positive-card' : 'negative-card'}`}>
              <span className="pl-card-label">Gross Profit</span>
              <span className="pl-card-value">{fmt(data.grossProfit)}</span>
              <span className="pl-card-sub">Margin: {pct(data.grossMargin)}</span>
            </div>
          </div>

          {/* Expenses breakdown */}
          <div className="accounting-card">
            <h2 className="accounting-card-title">Operating Expenses</h2>

            {data.expenseBreakdown.length === 0 ? (
              <p className="acct-empty">No expenses recorded in this period.</p>
            ) : (
              <>
                <div className="pl-expense-bars">
                  {data.expenseBreakdown.map(e => (
                    <div key={e.category} className="pl-expense-row">
                      <span className="pl-expense-label">{label(e.category)}</span>
                      <div className="pl-bar-track">
                        <div
                          className="pl-bar-fill"
                          style={{ width: `${(e.amount / maxExpense) * 100}%` }}
                        />
                      </div>
                      <span className="pl-expense-amount">{fmt(e.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="pl-expense-total">
                  <span>Total Expenses</span>
                  <strong className="negative">{fmt(data.totalExpenses)}</strong>
                </div>
              </>
            )}
          </div>

          {/* Net profit */}
          <div className={`pl-net-card ${data.netProfit >= 0 ? 'positive-card' : 'negative-card'}`}>
            <div className="pl-net-row">
              <span className="pl-net-label">Net Profit</span>
              <span className="pl-net-value">{fmt(data.netProfit)}</span>
            </div>
            <div className="pl-net-row pl-net-sub">
              <span>Net Margin</span>
              <span>{pct(data.netMargin)}</span>
            </div>
            <div className="pl-net-row pl-net-sub">
              <span>Revenue</span>
              <span>{fmt(data.revenue)}</span>
            </div>
            <div className="pl-net-row pl-net-sub">
              <span>– Cost of Goods</span>
              <span>{fmt(data.cogs)}</span>
            </div>
            <div className="pl-net-row pl-net-sub">
              <span>– Operating Expenses</span>
              <span>{fmt(data.totalExpenses)}</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
