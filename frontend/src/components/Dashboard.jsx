import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    lowStock: 0,
    expiring: 0,
    todaySales: 0,
    yesterdaySales: 0,
    dayChange: 0,
  });
  const [tally, setTally] = useState([]);
  const api = useApi();

  useEffect(() => {
    Promise.all([
      api.get('/inventory/alerts').catch(() => ({ lowStock: [], expiryWarnings: [] })),
      api.get('/reports/overview').catch(() => ({})),
      api.get('/inventory/tally').catch(() => []),
    ]).then(([alerts, overview, tallyData]) => {
      setStats({
        lowStock: alerts.lowStock?.length ?? 0,
        expiring: alerts.expiryWarnings?.length ?? 0,
        todaySales: overview.todaySales ?? 0,
        yesterdaySales: overview.yesterdaySales ?? 0,
        dayChange: overview.dayChange ?? 0,
      });
      setTally(Array.isArray(tallyData) ? tallyData : []);
    });
  }, []);

  const diff = stats.dayChange;
  const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
  const absDiff = Math.abs(diff || 0);

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <section className="dashboard-sales-section">
        <div className="dashboard-sales-card">
          <div className="dashboard-sales-main">
            <div>
              <p className="dashboard-sales-label">Today&apos;s Sales</p>
              <p className="dashboard-sales-value">
                ₵{(stats.todaySales || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="dashboard-sales-meta">
            <span className={`sales-trend sales-trend-${trend}`}>
              {trend === 'up' && <span className="trend-icon">🟢▲</span>}
              {trend === 'down' && <span className="trend-icon">🔴▼</span>}
              {trend === 'neutral' && <span className="trend-icon">➖</span>}
              <span className="trend-text">
                {trend === 'neutral'
                  ? 'Same as yesterday'
                  : `${trend === 'up' ? 'Up' : 'Down'} ₵${absDiff.toFixed(2)} vs yesterday`}
              </span>
            </span>
            <span className="sales-sub">
              Yesterday: ₵{(stats.yesterdaySales || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </section>

      <div className="dashboard-cards">
        <Link to="/app/inventory/alerts" className="dashboard-card alert">
          <span className="dashboard-card-value">{stats.lowStock}</span>
          <span className="dashboard-card-label">Low Stock Alerts</span>
        </Link>
        <Link to="/app/reports" className="dashboard-card warning">
          <span className="dashboard-card-value">{stats.expiring}</span>
          <span className="dashboard-card-label">Expiring Soon</span>
        </Link>
        <Link to="/app/sales" className="dashboard-card primary">
          <span className="dashboard-card-label">Point of Sale</span>
          <span className="dashboard-card-cta">Open POS →</span>
        </Link>
      </div>

      <section className="dashboard-tally-section">
        <div className="dashboard-tally-header">
          <h2>Stock Tally</h2>
          <Link to="/app/inventory?tab=tally" className="dashboard-tally-link">View full tally →</Link>
        </div>
        {tally.length === 0 ? (
          <p className="dashboard-tally-empty">No stock batches found.</p>
        ) : (
          <div className="dashboard-tally-wrap">
            <table className="dashboard-tally-table">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Supplier</th>
                  <th>Invoice No.</th>
                  <th>Batch No.</th>
                  <th>Received</th>
                  <th>Sold</th>
                  <th>Current Stock</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {tally.slice(0, 10).map((row) => (
                  <tr key={row.batch_id}>
                    <td>{row.drug_name}</td>
                    <td>{row.supplier_name}</td>
                    <td>{row.supplier_invoice}</td>
                    <td>{row.batch_number}</td>
                    <td>{row.received}</td>
                    <td>{row.sold}</td>
                    <td className={row.current_stock === 0 ? 'tally-zero' : ''}>{row.current_stock}</td>
                    <td>{row.expiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
