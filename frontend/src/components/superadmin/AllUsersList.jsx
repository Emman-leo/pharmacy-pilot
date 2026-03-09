import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';
import './AllUsersList.css';

export default function AllUsersList() {
  const { user, loading: authLoading } = useAuth();
  const api = useApi();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading || !user) return; // wait for auth to settle
    async function fetchUsers() {
      try {
        const data = await api.get(`/admin/users?_=${Date.now()}`);
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [user, authLoading]);

  if (loading) return <Spinner label="Loading users..." />;
  if (error) return <div className="error-banner">{error}</div>;

  const getRoleBadge = (role) => {
    const colors = {
      ADMIN: 'success',
      STAFF: 'primary',
      SUPER_ADMIN: 'warning'
    };
    const color = colors[role] || 'secondary';
    return <span className={`status-badge status-badge-${color}`}>{role}</span>;
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`status-badge ${isActive ? 'status-badge-success' : 'status-badge-danger'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div className="all-users-list">
      <div className="sales-history-header">
        <h2>All Users</h2>
        <p className="text-muted">Manage all users across all pharmacies</p>
      </div>

      <div className="sales-history-table-container">
        <table className="sales-history-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Pharmacy</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name || '-'}</td>
                <td>{user.email}</td>
                <td>{getRoleBadge(user.role)}</td>
                <td>
                  {user.pharmacy_name || (
                    <span className="text-muted">Super Admin</span>
                  )}
                </td>
                <td>{getStatusBadge(user.is_active)}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="empty-state">
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
