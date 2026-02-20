import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    lowStock: 0,
    expiring: 0,
    pending: 0,
    todaySales: 0,
    yesterdaySales: 0,
    dayChange: 0,
  });
  const api = useApi();

  useEffect(() => {
    Promise.all([
      api.get('/inventory/alerts').catch(() => ({ lowStock: [], expiryWarnings: [] })),
      api.get('/prescriptions/pending').catch(() => []),
      api.get('/reports/overview').catch(() => ({})),
    ]).then(([alerts, pending, overview]) => {
      setStats((prev) => ({
        ...prev,
        lowStock: alerts.lowStock?.length ?? 0,
        expiring: alerts.expiryWarnings?.length ?? 0,
        pending: Array.isArray(pending) ? pending.length : 0,
        todaySales: overview.todaySales ?? 0,
        yesterdaySales: overview.yesterdaySales ?? 0,
        dayChange: overview.dayChange ?? 0,
      }));
    });
  }, []);

  const diff = stats.dayChange;
  const trend =
    diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
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
                  : `${trend === 'up' ? 'Up' : 'Down'} ₵${absDiff.toFixed(
                      2,
                    )} vs yesterday`}
              </span>
            </span>
            <span className="sales-sub">
              Yesterday: ₵{(stats.yesterdaySales || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </section>
      <div className="dashboard-cards">
        <Link to="/inventory/alerts" className="dashboard-card alert">
          <span className="dashboard-card-value">{stats.lowStock}</span>
          <span className="dashboard-card-label">Low Stock Alerts</span>
        </Link>
        <Link to="/reports" className="dashboard-card warning">
          <span className="dashboard-card-value">{stats.expiring}</span>
          <span className="dashboard-card-label">Expiring Soon</span>
        </Link>
        <Link to="/prescriptions/approval" className="dashboard-card info">
          <span className="dashboard-card-value">{stats.pending}</span>
          <span className="dashboard-card-label">Pending Prescriptions</span>
        </Link>
        <Link to="/sales" className="dashboard-card primary">
          <span className="dashboard-card-label">Point of Sale</span>
          <span className="dashboard-card-cta">Open POS →</span>
        </Link>
      </div>
    </div>
  );
}
