import { useAuth } from '../../contexts/AuthContext';

export default function SubscriptionExpired() {
  const { logout } = useAuth();

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
        
        <a
          href="mailto:pharmacypilot@webdevv.io"
          className="btn btn-primary btn-block"
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
