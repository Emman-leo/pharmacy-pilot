import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Spinner from '../common/Spinner';

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
  if (error) return <div className="error-message">Error: {error}</div>;

  const getStatusBadge = (status) => {
    const colors = {
      trial: 'badge-warning',
      active: 'badge-success',
      past_due: 'badge-danger',
      cancelled: 'badge-secondary'
    };
    return <span className={`badge ${colors[status] || 'badge-secondary'}`}>{status}</span>;
  };

  const getTierBadge = (tier) => {
    const colors = {
      starter: 'badge-info',
      growth: 'badge-primary',
      pro: 'badge-success'
    };
    return <span className={`badge ${colors[tier] || 'badge-secondary'}`}>{tier}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Platform Overview</h1>
        <p>System-wide statistics and pharmacy management</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total_pharmacies}</div>
          <div className="stat-label">Total Pharmacies</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.active_subscriptions}</div>
          <div className="stat-label">Active Subscriptions</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.trial_pharmacies}</div>
          <div className="stat-label">On Trial</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.total_users}</div>
          <div className="stat-label">Total Users</div>
        </div>
      </div>

      {/* Pharmacies Table */}
      <div className="card">
        <div className="card-header">
          <h2>All Pharmacies</h2>
          <Link to="/super-admin/pharmacies/new" className="btn btn-primary">
            New Pharmacy
          </Link>
        </div>
        <div className="card-content">
          {pharmacies.length === 0 ? (
            <div className="empty-state">
              <p>No pharmacies found. Create your first pharmacy to get started.</p>
              <Link to="/super-admin/pharmacies/new" className="btn btn-primary">
                Create Pharmacy
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
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
                          className="link"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
