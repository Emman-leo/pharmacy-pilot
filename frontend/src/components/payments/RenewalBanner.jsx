import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';

export default function RenewalBanner() {
  const { tier, subscriptionStatus, trialEndsAt } = useAuth();
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Show banner if trial ends within 7 days or past_due
  const shouldShow = () => {
    if (subscriptionStatus === 'past_due') return true;
    if (subscriptionStatus === 'trial' && trialEndsAt) {
      const daysLeft = Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7;
    }
    return false;
  };

  if (!shouldShow()) return null;

  const daysLeft = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  const tierPrices = { starter: 250, growth: 550, pro: 900 };
  const price = tierPrices[tier] || 250;

  const handlePay = async () => {
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
    <div style={{
      background: subscriptionStatus === 'past_due' ? '#fef2f2' : '#fffbeb',
      borderBottom: `1px solid ${subscriptionStatus === 'past_due' ? '#fca5a5' : '#fcd34d'}`,
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      fontSize: '0.875rem',
    }}>
      <span style={{ color: subscriptionStatus === 'past_due' ? '#991b1b' : '#92400e', fontWeight: 500 }}>
        {subscriptionStatus === 'past_due'
          ? '⚠️ Your subscription is past due. Renew now to avoid losing access.'
          : `⏰ Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now to keep access.`}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {error && <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>{error}</span>}
        <button
          onClick={handlePay}
          disabled={loading}
          style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 16px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Redirecting...' : `Pay GHS ${price} →`}
        </button>
      </div>
    </div>
  );
}
