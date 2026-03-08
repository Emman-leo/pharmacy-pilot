import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Spinner from '../common/Spinner';

export default function CreatePharmacyForm() {
  const api = useApi();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [pharmacyData, setPharmacyData] = useState({
    name: '',
    address: '',
    phone: '',
    tier: 'starter',
    subscription_status: 'trial',
    trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +30 days
  });

  const [adminData, setAdminData] = useState({
    full_name: '',
    email: '',
    password: ''
  });

  const handlePharmacyChange = (e) => {
    const { name, value } = e.target;
    setPharmacyData(prev => ({ ...prev, [name]: value }));
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setAdminData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!pharmacyData.name.trim()) {
      setError('Pharmacy name is required');
      return false;
    }
    if (!adminData.full_name.trim()) {
      setError('Admin full name is required');
      return false;
    }
    if (!adminData.email.trim()) {
      setError('Admin email is required');
      return false;
    }
    if (adminData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Create pharmacy first
      const pharmacy = await api.post('/admin/pharmacies', pharmacyData);
      
      // Then create admin user for that pharmacy
      await api.post(`/admin/pharmacies/${pharmacy.id}/users`, {
        ...adminData,
        role: 'ADMIN'
      });

      // Navigate to pharmacy detail page
      navigate(`/super-admin/pharmacies/${pharmacy.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner label="Creating pharmacy..." />;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Create New Pharmacy</h1>
        <p>Set up a new pharmacy and create the admin account</p>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {error && <div className="error-message">{error}</div>}

        {/* Pharmacy Information */}
        <div className="card">
          <div className="card-header">
            <h2>Pharmacy Information</h2>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label htmlFor="name" className="form-label required">
                Pharmacy Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={pharmacyData.name}
                onChange={handlePharmacyChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="address" className="form-label">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={pharmacyData.address}
                onChange={handlePharmacyChange}
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={pharmacyData.phone}
                onChange={handlePharmacyChange}
                className="form-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tier" className="form-label">
                  Tier
                </label>
                <select
                  id="tier"
                  name="tier"
                  value={pharmacyData.tier}
                  onChange={handlePharmacyChange}
                  className="form-select"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subscription_status" className="form-label">
                  Subscription Status
                </label>
                <select
                  id="subscription_status"
                  name="subscription_status"
                  value={pharmacyData.subscription_status}
                  onChange={handlePharmacyChange}
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
              <label htmlFor="trial_ends_at" className="form-label">
                Trial Ends Date
              </label>
              <input
                type="date"
                id="trial_ends_at"
                name="trial_ends_at"
                value={pharmacyData.trial_ends_at}
                onChange={handlePharmacyChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Admin Account */}
        <div className="card">
          <div className="card-header">
            <h2>Admin Account</h2>
            <p>Create the primary administrator for this pharmacy</p>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label htmlFor="full_name" className="form-label required">
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={adminData.full_name}
                onChange={handleAdminChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label required">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={adminData.email}
                onChange={handleAdminChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label required">
                Temporary Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={adminData.password}
                onChange={handleAdminChange}
                className="form-input"
                placeholder="Min 8 characters"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Pharmacy'}
          </button>
        </div>
      </form>
    </div>
  );
}
