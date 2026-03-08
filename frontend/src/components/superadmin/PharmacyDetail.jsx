import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Spinner from '../common/Spinner';

export default function PharmacyDetail() {
  const { id } = useParams();
  const api = useApi();
  const [pharmacy, setPharmacy] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit mode for pharmacy info
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  
  // Add user form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: 'STAFF',
    password: ''
  });
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pharmacyData, usersData] = await Promise.all([
          api.get(`/admin/pharmacies`),
          api.get(`/admin/pharmacies/${id}/users`)
        ]);
        
        const pharmacy = pharmacyData.find(p => p.id === id);
        if (!pharmacy) {
          throw new Error('Pharmacy not found');
        }
        
        setPharmacy(pharmacy);
        setUsers(usersData);
        setEditData({
          tier: pharmacy.tier,
          subscription_status: pharmacy.subscription_status,
          trial_ends_at: pharmacy.trial_ends_at
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [api, id]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSavePharmacy = async () => {
    try {
      const updated = await api.put(`/admin/pharmacies/${id}`, editData);
      setPharmacy(prev => ({ ...prev, ...updated }));
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.full_name.trim() || !newUser.email.trim() || newUser.password.length < 8) {
      setError('Please fill all required fields with valid data');
      return;
    }

    setUserLoading(true);
    try {
      const createdUser = await api.post(`/admin/pharmacies/${id}/users`, newUser);
      setUsers(prev => [createdUser, ...prev]);
      setNewUser({ full_name: '', email: '', role: 'STAFF', password: '' });
      setShowAddUser(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUserLoading(false);
    }
  };

  if (loading) return <Spinner label="Loading pharmacy details..." />;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!pharmacy) return <div className="error-message">Pharmacy not found</div>;

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

  const getRoleBadge = (role) => {
    return <span className={`badge ${role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'}`}>{role}</span>;
  };

  const getActiveBadge = (isActive) => {
    return <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>{isActive ? 'Yes' : 'No'}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{pharmacy.name}</h1>
        <p>Manage pharmacy settings and users</p>
      </div>

      {/* Pharmacy Information */}
      <div className="card">
        <div className="card-header">
          <h2>Pharmacy Information</h2>
          {!editMode && (
            <button 
              className="btn btn-secondary"
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          )}
        </div>
        <div className="card-content">
          <div className="info-grid">
            <div className="info-item">
              <label>Address</label>
              <span>{pharmacy.address || '-'}</span>
            </div>
            <div className="info-item">
              <label>Phone</label>
              <span>{pharmacy.phone || '-'}</span>
            </div>
            <div className="info-item">
              <label>Created</label>
              <span>{new Date(pharmacy.created_at).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <label>Staff Count</label>
              <span>{pharmacy.staff_count}</span>
            </div>
          </div>

          {editMode ? (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tier" className="form-label">Tier</label>
                  <select
                    id="tier"
                    name="tier"
                    value={editData.tier}
                    onChange={handleEditChange}
                    className="form-select"
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="subscription_status" className="form-label">Subscription Status</label>
                  <select
                    id="subscription_status"
                    name="subscription_status"
                    value={editData.subscription_status}
                    onChange={handleEditChange}
                    className="form-select"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="trial_ends_at" className="form-label">Trial Ends Date</label>
                <input
                  type="date"
                  id="trial_ends_at"
                  name="trial_ends_at"
                  value={editData.trial_ends_at || ''}
                  onChange={handleEditChange}
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleSavePharmacy}
                >
                  Save Changes
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditMode(false);
                    setEditData({
                      tier: pharmacy.tier,
                      subscription_status: pharmacy.subscription_status,
                      trial_ends_at: pharmacy.trial_ends_at
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="info-grid">
              <div className="info-item">
                <label>Tier</label>
                <span>{getTierBadge(pharmacy.tier)}</span>
              </div>
              <div className="info-item">
                <label>Status</label>
                <span>{getStatusBadge(pharmacy.subscription_status)}</span>
              </div>
              <div className="info-item">
                <label>Trial Ends</label>
                <span>
                  {pharmacy.trial_ends_at 
                    ? new Date(pharmacy.trial_ends_at).toLocaleDateString()
                    : '-'
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Users */}
      <div className="card">
        <div className="card-header">
          <h2>Users</h2>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddUser(!showAddUser)}
          >
            Add User
          </button>
        </div>
        <div className="card-content">
          {showAddUser && (
            <form onSubmit={handleAddUser} className="add-user-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="full_name" className="form-label required">Full Name</label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={newUser.full_name}
                    onChange={handleAddUserChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email" className="form-label required">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleAddUserChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role" className="form-label">Role</label>
                  <select
                    id="role"
                    name="role"
                    value={newUser.role}
                    onChange={handleAddUserChange}
                    className="form-select"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="password" className="form-label required">Temporary Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={newUser.password}
                    onChange={handleAddUserChange}
                    className="form-input"
                    placeholder="Min 8 characters"
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={userLoading}>
                  {userLoading ? 'Adding...' : 'Add User'}
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUser({ full_name: '', email: '', role: 'STAFF', password: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {users.length === 0 ? (
            <div className="empty-state">
              <p>No users found for this pharmacy.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Active</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td>{user.email}</td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>{getActiveBadge(user.is_active)}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
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
