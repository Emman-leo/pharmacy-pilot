import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';
import './SettingsPage.css';

export default function SettingsPage() {
  const api = useApi();
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('pharmacy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pharmacy data
  const [pharmacyData, setPharmacyData] = useState(null);
  
  // Staff data
  const [staff, setStaff] = useState([]);
  const [staffCount, setStaffCount] = useState({ current: 0, max: Infinity });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    role: 'STAFF',
    password: '',
    confirmPassword: ''
  });

  const loadPharmacyData = async () => {
    try {
      const data = await api.get('/pharmacies/my-settings');
      setPharmacyData(data);
    } catch (e) {
      setError(e.message || 'Failed to load pharmacy data');
    }
  };

  const loadStaffData = async () => {
    try {
      const [users, count] = await Promise.all([
        api.get('/auth/users'),
        api.get('/pharmacies/staff-count')
      ]);
      setStaff(users || []);
      setStaffCount(count || { current: 0, max: Infinity });
    } catch (e) {
      setError(e.message || 'Failed to load staff data');
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(true);
      setError('');
      
      if (activeTab === 'pharmacy') {
        loadPharmacyData();
      } else {
        loadStaffData();
      }
      
      setLoading(false);
    }
  }, [authLoading, user, activeTab]);

  const handleRoleToggle = async (userId, currentRole) => {
    try {
      const newRole = currentRole === 'ADMIN' ? 'STAFF' : 'ADMIN';
      await api.put(`/auth/users/${userId}/role`, { role: newRole });
      loadStaffData();
    } catch (e) {
      setError(e.message || 'Failed to update role');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await api.put(`/auth/users/${userId}/status`, { is_active: !currentStatus });
      loadStaffData();
    } catch (e) {
      setError(e.message || 'Failed to update status');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (addForm.password !== addForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (addForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await api.post('/auth/users', {
        full_name: addForm.full_name,
        email: addForm.email,
        role: addForm.role,
        password: addForm.password
      });
      setAddForm({ full_name: '', email: '', role: 'STAFF', password: '', confirmPassword: '' });
      setShowAddForm(false);
      loadStaffData();
    } catch (e) {
      setError(e.message || 'Failed to add staff');
    }
  };

  const canAddStaff = staffCount.current < staffCount.max;

  if (authLoading || loading) {
    return <Spinner />;
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'pharmacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('pharmacy')}
          >
            Pharmacy
          </button>
          <button
            className={`tab-button ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            Staff
          </button>
        </div>
      </div>

      {error && (
        <div className="settings-error">
          {error}
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      {activeTab === 'pharmacy' && pharmacyData && (
        <div className="settings-section">
          <div className="pharmacy-info">
            <div className="info-row">
              <label>Pharmacy Name:</label>
              <span>{pharmacyData.name}</span>
            </div>
            <div className="info-row">
              <label>Address:</label>
              <span>{pharmacyData.address}</span>
            </div>
            <div className="info-row">
              <label>Phone:</label>
              <span>{pharmacyData.phone}</span>
            </div>
            <div className="info-row">
              <label>Tier:</label>
              <span className={`tier-badge tier-${pharmacyData.tier}`}>
                {pharmacyData.tier?.toUpperCase()}
              </span>
            </div>
            <div className="info-row">
              <label>Subscription:</label>
              <span className={`status-badge ${pharmacyData.subscriptionStatus === 'active' ? 'active' : 'inactive'}`}>
                {pharmacyData.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="settings-section">
          <div className="staff-header">
            <div className="staff-usage">
              <span className="usage-text">
                {staffCount.current} / {staffCount.max === Infinity ? '∞' : staffCount.max} staff slots used
              </span>
            </div>
            <button
              className="add-staff-button"
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={!canAddStaff}
              title={!canAddStaff ? 'Staff limit reached' : ''}
            >
              Add Staff
            </button>
          </div>

          {showAddForm && (
            <form className="add-staff-form" onSubmit={handleAddStaff}>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({...addForm, full_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="email"
                  placeholder="Email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({...addForm, role: e.target.value})}
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="form-row">
                <input
                  type="password"
                  placeholder="Password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({...addForm, password: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={addForm.confirmPassword}
                  onChange={(e) => setAddForm({...addForm, confirmPassword: e.target.value})}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">Add Staff</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="cancel-button">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="staff-table-container">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td>{member.full_name}</td>
                    <td>{member.email}</td>
                    <td>
                      {member.id !== user?.id ? (
                        <button
                          className={`role-badge role-${member.role.toLowerCase()}`}
                          onClick={() => handleRoleToggle(member.id, member.role)}
                        >
                          {member.role}
                        </button>
                      ) : (
                        <span className={`role-badge role-${member.role.toLowerCase()}`}>
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${member.is_active ? 'active' : 'inactive'}`}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {member.id !== user?.id && (
                        <button
                          className={`action-button ${member.is_active ? 'deactivate' : 'activate'}`}
                          onClick={() => handleStatusToggle(member.id, member.is_active)}
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
