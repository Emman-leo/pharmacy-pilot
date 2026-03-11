import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';

export default function SubscriptionExpired() {
  const { logout } = useAuth();
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRenew = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.post('/payments/initialize');
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err.message || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Subscription Expired</h1>
        <p className="login-subtitle">
          Your pharmacy's subscription has expired or been cancelled.
        </p>
        <p className="login-subtitle">
          Please contact us to reactivate your account.
        </p>
        
        {error && (
          <div className="login-error" style={{ marginBottom: '12px' }}>
            {error}
          </div>
        )}
        
        <button
          onClick={handleRenew}
          disabled={loading}
          className="btn btn-primary btn-block"
          style={{ marginBottom: '12px' }}
        >
          {loading ? 'Initializing...' : 'Renew Now'}
        </button>
        
        <a
          href="mailto:pharmacypilot@webdevv.io"
          className="btn btn-ghost btn-block"
          style={{ marginBottom: '12px', textAlign: 'center', display: 'block' }}
        >
          Contact Support
        </a>
        <button
          className="btn btn-ghost btn-block"
          onClick={() => { logout(); window.location.href = '/login'; }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
