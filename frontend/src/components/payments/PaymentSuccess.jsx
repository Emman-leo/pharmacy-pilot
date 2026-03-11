import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import '../auth/Login.css';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const api = useApi();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [amount, setAmount] = useState(null);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) {
      setStatus('error');
      return;
    }
    api.get(`/payments/verify/${reference}`)
      .then((data) => {
        setAmount(data.amount);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="login-page">
      <div className="login-card">
        {status === 'verifying' && (
          <>
            <h1>Verifying payment...</h1>
            <p className="login-subtitle">Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1>✅ Payment successful!</h1>
            <p className="login-subtitle">
              {amount ? `GHS ${amount} received. ` : ''}
              Your subscription is now active.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate('/app')}
              style={{ marginTop: '16px' }}
            >
              Go to dashboard →
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>Something went wrong</h1>
            <p className="login-subtitle">
              We couldn't verify your payment. If you were charged, contact us at pharmacypilot@webdevv.io
            </p>
            <button
              className="btn btn-ghost btn-block"
              onClick={() => navigate('/app')}
              style={{ marginTop: '16px' }}
            >
              Back to app
            </button>
          </>
        )}
      </div>
    </div>
  );
}
