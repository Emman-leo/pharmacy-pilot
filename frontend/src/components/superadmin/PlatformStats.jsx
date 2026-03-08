import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Spinner from '../common/Spinner';
import './PlatformStats.css';

export default function PlatformStats() {
  const api = useApi();
  const [stats, setStats] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, pharmaciesData] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/pharmacies')
        ]);
        setStats(statsData);
        setPharmacies(pharmaciesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [api]);

  if (loading) return <Spinner label="Loading platform stats..." />;
  if (error) return <div className="error-banner">{error}</div>;

  const getStatusBadge = (status) => {
    const colors = {
      trial: 'warning',
      active: 'success',
      past_due: 'danger',
      cancelled: 'secondary'
    };
    return <span className={`status-badge ${colors[status] || 'secondary'}`}>{status}</span>;
  };

  const getTierBadge = (tier) => {
    const colors = {
      starter: 'info',
      growth: 'primary',
      pro: 'success'
    };
    return <span className={`status-badge ${colors[tier] || 'secondary'}`}>{tier}</span>;
  };

  return (
    <div className="platform-stats">
      <div className="platform-stats-header">
        <h1>Platform Overview</h1>
        <p>System-wide statistics and pharmacy management</p>
      </div>

      {/* Stats Cards - using Dashboard pattern */}
      <div className="dashboard-cards">
        <div className="dashboard-card primary">
          <span className="dashboard-card-value">{stats.total_pharmacies}</span>
          <span className="dashboard-card-label">Total Pharmacies</span>
        </div>
        <div className="dashboard-card success">
          <span className="dashboard-card-value">{stats.active_subscriptions}</span>
          <span className="dashboard-card-label">Active Subscriptions</span>
        </div>
        <div className="dashboard-card warning">
          <span className="dashboard-card-value">{stats.trial_pharmacies}</span>
          <span className="dashboard-card-label">On Trial</span>
        </div>
        <div className="dashboard-card info">
          <span className="dashboard-card-value">{stats.total_users}</span>
          <span className="dashboard-card-label">Total Users</span>
        </div>
      </div>

      {/* Pharmacies Table - using SalesHistory pattern */}
      <div className="sales-history-table-container">
        <div className="sales-history-header">
          <h2>All Pharmacies</h2>
          <Link to="/super-admin/pharmacies/new" className="btn btn-primary">
            New Pharmacy
          </Link>
        </div>

        {pharmacies.length === 0 ? (
          <div className="no-sales">
            <p>No pharmacies found. Create your first pharmacy to get started.</p>
            <Link to="/super-admin/pharmacies/new" className="btn btn-primary">
              Create Pharmacy
            </Link>
          </div>
        ) : (
          <table className="sales-history-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Trial Ends</th>
                <th>Staff Count</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {pharmacies.map((pharmacy) => (
                <tr key={pharmacy.id}>
                  <td>
                    <Link 
                      to={`/super-admin/pharmacies/${pharmacy.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      {pharmacy.name}
                    </Link>
                  </td>
                  <td>{getTierBadge(pharmacy.tier)}</td>
                  <td>{getStatusBadge(pharmacy.subscription_status)}</td>
                  <td>
                    {pharmacy.trial_ends_at 
                      ? new Date(pharmacy.trial_ends_at).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td>{pharmacy.staff_count}</td>
                  <td>{new Date(pharmacy.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
