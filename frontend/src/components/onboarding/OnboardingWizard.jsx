import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import './OnboardingWizard.css';

const TIERS = [
  {
    value:    'starter',
    label:    'Starter',
    price:    'GHS 250',
    tagline:  'Best for small, low-volume pharmacies',
    features: ['2 staff accounts', 'Inventory & batch tracking', 'Point of sale & receipts', 'Low stock & expiry alerts', 'Basic sales reports'],
  },
  {
    value:    'growth',
    label:    'Growth',
    price:    'GHS 550',
    tagline:  'Best for established independents',
    features: ['5 staff accounts', 'Everything in Starter', 'Advanced analytics & charts', 'CSV export', 'Audit log'],
    featured: true,
  },
  {
    value:    'pro',
    label:    'Pro',
    price:    'GHS 900',
    tagline:  'Best for busy or multi-staff pharmacies',
    features: ['Unlimited staff', 'Everything in Growth', 'Expense tracking & P&L', 'Daily cash reconciliation', 'Multi-branch support'],
  },
];

export default function OnboardingWizard() {
  const api      = useApi();
  const { login, profile } = useAuth();
  const navigate = useNavigate();

  const [step,          setStep]          = useState(1);
  const [pharmacyName,  setPharmacyName]  = useState('');
  const [phone,         setPhone]         = useState('');
  const [address,       setAddress]       = useState('');
  const [tier,          setTier]          = useState('starter');
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  const handleSubmit = async () => {
    if (!pharmacyName.trim()) {
      return setError('Pharmacy name is required');
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/onboarding/complete', {
        pharmacy_name: pharmacyName.trim(),
        phone:         phone.trim() || undefined,
        address:       address.trim() || undefined,
        tier,
      });

      // Re-fetch user profile so AuthContext has pharmacy_id
      const { user: u, profile: p, tier: t } = await api.get('/auth/user');
      // Force a page reload to re-initialize AuthContext cleanly
      window.location.href = '/app';
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <span className="onboarding-logo">Pharmacy Pilot</span>
      </div>

      <div className="onboarding-container">
        {/* Progress */}
        <div className="onboarding-progress">
          {[1, 2].map(s => (
            <div key={s} className={`progress-step ${step >= s ? 'active' : ''}`}>
              <div className="progress-dot">{step > s ? '✓' : s}</div>
              <span>{s === 1 ? 'Your pharmacy' : 'Choose plan'}</span>
            </div>
          ))}
        </div>

        {error && <div className="onboarding-error">{error}</div>}

        {/* Step 1 — Pharmacy details */}
        {step === 1 && (
          <div className="onboarding-card">
            <h2>Tell us about your pharmacy</h2>
            <p className="onboarding-sub">This sets up your workspace on Pharmacy Pilot.</p>

            <div className="onboarding-form">
              <div className="onboarding-field">
                <label>Pharmacy Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Gilead Pharmacy"
                  value={pharmacyName}
                  onChange={e => setPharmacyName(e.target.value)}
                  className="onboarding-input"
                  autoFocus
                />
              </div>
              <div className="onboarding-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0241234567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="onboarding-input"
                />
              </div>
              <div className="onboarding-field">
                <label>Address</label>
                <input
                  type="text"
                  placeholder="e.g. 12 Accra Road, Kumasi"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="onboarding-input"
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block onboarding-next"
              onClick={() => {
                if (!pharmacyName.trim()) return setError('Pharmacy name is required');
                setError('');
                setStep(2);
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — Tier selection */}
        {step === 2 && (
          <div className="onboarding-card onboarding-card-wide">
            <h2>Choose your plan</h2>
            <p className="onboarding-sub">30-day free trial on any plan. No payment needed today.</p>

            <div className="onboarding-tiers">
              {TIERS.map(t => (
                <div
                  key={t.value}
                  className={`onboarding-tier ${tier === t.value ? 'selected' : ''} ${t.featured ? 'featured' : ''}`}
                  onClick={() => setTier(t.value)}
                >
                  {t.featured && <div className="tier-badge">Most popular</div>}
                  <div className="tier-header">
                    <h3>{t.label}</h3>
                    <p className="tier-tagline">{t.tagline}</p>
                    <div className="tier-price">{t.price}<span>/month</span></div>
                  </div>
                  <ul className="tier-features">
                    {t.features.map(f => (
                      <li key={f}><span className="tier-check">✓</span>{f}</li>
                    ))}
                  </ul>
                  <div className={`tier-select-indicator ${tier === t.value ? 'active' : ''}`}>
                    {tier === t.value ? '● Selected' : '○ Select'}
                  </div>
                </div>
              ))}
            </div>

            <div className="onboarding-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Setting up your pharmacy…' : 'Start free trial →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
