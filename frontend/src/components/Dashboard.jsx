import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState({ lowStock: 0, expiring: 0, pending: 0 });
  const api = useApi();

  useEffect(() => {
    Promise.all([
      api.get('/inventory/alerts').catch(() => ({ lowStock: [], expiryWarnings: [] })),
      api.get('/prescriptions/pending').catch(() => []),
    ]).then(([alerts, pending]) => {
      setStats({
        lowStock: alerts.lowStock?.length ?? 0,
        expiring: alerts.expiryWarnings?.length ?? 0,
        pending: Array.isArray(pending) ? pending.length : 0,
      });
    });
  }, []);

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="dashboard-cards">
        <Link to="/inventory/alerts" className="dashboard-card alert">
          <span className="dashboard-card-value">{stats.lowStock}</span>
          <span className="dashboard-card-label">Low Stock Alerts</span>
        </Link>
        <Link to="/reports/expiry" className="dashboard-card warning">
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
