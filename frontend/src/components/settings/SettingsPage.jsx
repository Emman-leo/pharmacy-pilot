import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';
import './SettingsPage.css';

export default function SettingsPage() {
  const api = useApi();
  const { user, profile, tier, subscriptionStatus, currentPeriodEnd, loading: authLoading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('pharmacy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Billing state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(1);
  
  const DURATION_OPTIONS = [
    { label: '1 month', months: 1 },
    { label: '3 months', months: 3 },
    { label: '6 months', months: 6 },
    { label: '12 months', months: 12 },
  ];
  
  // Pharmacy data
  const [pharmacyData, setPharmacyData] = useState(null);
  
  // Staff data
  const [staff, setStaff] = useState([]);
  const [staffCount, setStaffCount] = useState({ count: 0, max: null });
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
      const data = await api.get('/pharmacies');
      // data is an array, take the first (user's pharmacy)
      setPharmacyData(data?.[0] || null);
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
      setStaffCount(count || { count: 0, max: null });
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
      } else if (activeTab === 'staff') {
        loadStaffData();
      } else if (activeTab === 'payments') {
        loadPaymentHistory();
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

  const canAddStaff = staffCount.max === null || staffCount.count < staffCount.max;

  const handlePayment = async () => {
    setPaymentLoading(true);
    setPaymentError('');
    try {
      const data = await api.post('/payments/initialize', { months: selectedMonths });
      window.location.href = data.authorization_url;
    } catch (err) {
      setPaymentError(err.message || 'Failed to initialize payment');
      setPaymentLoading(false);
    }
  };

  const tierPrices = { starter: 250, growth: 550, pro: 900 };
  const currentPrice = tierPrices[tier] || 250;

  // Payment history (#17)
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState('');

  const loadPaymentHistory = async () => {
    setPaymentHistoryLoading(true);
    setPaymentHistoryError('');
    try {
      const data = await api.get('/payments/history');
      setPaymentHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      setPaymentHistoryError(e.message || 'Failed to load payment history');
      setPaymentHistory([]);
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  // Editable pharmacy info (#18)
  const [editPharmacy, setEditPharmacy] = useState(false);
  const [pharmacyForm, setPharmacyForm] = useState({ name: '', address: '', phone: '' });

  const startEditPharmacy = () => {
    setPharmacyForm({
      name: pharmacyData?.name || '',
      address: pharmacyData?.address || '',
      phone: pharmacyData?.phone || '',
    });
    setEditPharmacy(true);
  };

  const savePharmacyChanges = async () => {
    setError('');
    try {
      await api.put('/pharmacies/my-settings', {
        name: pharmacyForm.name,
        address: pharmacyForm.address || null,
        phone: pharmacyForm.phone || null,
      });
      setEditPharmacy(false);
      await loadPharmacyData();
    } catch (e) {
      setError(e.message || 'Failed to update pharmacy');
    }
  };

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
          <button
            className={`tab-button ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            Billing
          </button>
          <button
            className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
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
              {editPharmacy && isAdmin ? (
                <input
                  className="settings-input"
                  type="text"
                  value={pharmacyForm.name}
                  onChange={(e) => setPharmacyForm((f) => ({ ...f, name: e.target.value }))}
                />
              ) : (
                <span>{pharmacyData.name}</span>
              )}
            </div>
            <div className="info-row">
              <label>Address:</label>
              {editPharmacy && isAdmin ? (
                <input
                  className="settings-input"
                  type="text"
                  value={pharmacyForm.address}
                  onChange={(e) => setPharmacyForm((f) => ({ ...f, address: e.target.value }))}
                />
              ) : (
                <span>{pharmacyData.address}</span>
              )}
            </div>
            <div className="info-row">
              <label>Phone:</label>
              {editPharmacy && isAdmin ? (
                <input
                  className="settings-input"
                  type="text"
                  value={pharmacyForm.phone}
                  onChange={(e) => setPharmacyForm((f) => ({ ...f, phone: e.target.value }))}
                />
              ) : (
                <span>{pharmacyData.phone}</span>
              )}
            </div>
            <div className="info-row">
              <label>Tier:</label>
              <span className={`tier-badge tier-${pharmacyData.tier}`}>
                {pharmacyData.tier?.toUpperCase()}
              </span>
            </div>
            <div className="info-row">
              <label>Subscription:</label>
              <span className={`status-badge ${pharmacyData.subscription_status === 'active' ? 'active' : 'inactive'}`}>
                {pharmacyData.subscription_status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>

            {isAdmin && !editPharmacy && (
              <div style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={startEditPharmacy}
                >
                  Edit pharmacy info
                </button>
              </div>
            )}

            {isAdmin && editPharmacy && (
              <div style={{ marginTop: '14px', display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-primary" onClick={savePharmacyChanges}>
                  Save Changes
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditPharmacy(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="settings-section">
          <div className="billing-info">
            <h2 style={{ marginTop: 0 }}>Payment History</h2>
            {paymentHistoryLoading ? (
              <Spinner />
            ) : paymentHistoryError ? (
              <div className="error-banner">{paymentHistoryError}</div>
            ) : paymentHistory.length === 0 ? (
              <div>No payments found.</div>
            ) : (
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Amount (GHS)</th>
                    <th>Plan</th>
                    <th>Period</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((p) => (
                    <tr key={p.reference}>
                      <td>{p.reference}</td>
                      <td>{p.amount_ghs != null ? `₵${Number(p.amount_ghs).toFixed(2)}` : '—'}</td>
                      <td>{p.plan ? String(p.plan).toUpperCase() : '—'}</td>
                      <td>
                        {p.period_start && p.period_end
                          ? `${p.period_start} → ${p.period_end}`
                          : '—'}
                      </td>
                      <td>{p.processed_at ? new Date(p.processed_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="settings-section">
          <div className="billing-info">
            <div className="info-row">
              <label>Current Plan:</label>
              <span className={`tier-badge tier-${tier}`}>
                {tier?.toUpperCase()} - GHS {currentPrice}
              </span>
            </div>
            <div className="info-row">
              <label>Subscription Status:</label>
              <span className={`status-badge ${subscriptionStatus === 'active' ? 'active' : subscriptionStatus === 'past_due' ? 'past-due' : 'trial'}`}>
                {subscriptionStatus === 'active' ? 'Active' : subscriptionStatus === 'past_due' ? 'Past Due' : 'Trial'}
              </span>
            </div>
            {currentPeriodEnd && (
              <div className="info-row">
                <label>Current Period Ends:</label>
                <span>{new Date(currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            )}
            <div className="info-row">
              <label>Duration:</label>
              <div className="duration-selector">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.months}
                    className={`duration-button ${selectedMonths === option.months ? 'selected' : ''}`}
                    onClick={() => setSelectedMonths(option.months)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="info-row">
              <label>Total:</label>
              <span className="total-amount">GHS {currentPrice * selectedMonths}</span>
            </div>
            <div className="info-row">
              <label></label>
              <div>
                {paymentError && <div className="payment-error">{paymentError}</div>}
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="pay-button"
                >
                  {paymentLoading ? 'Redirecting...' : `Pay GHS ${currentPrice * selectedMonths} →`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="settings-section">
          <div className="staff-header">
            <div className="staff-usage">
              <span className="usage-text">
                {staffCount.count} / {staffCount.max === null ? '∞' : staffCount.max} staff slots used
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
