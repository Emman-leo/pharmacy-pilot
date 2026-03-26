import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { exportReportDocument } from '../../utils/exportReportDocument.js';
import '../auth/Login.css';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const api = useApi();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [invoice, setInvoice] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) {
      setStatus('error');
      return;
    }
    api.get(`/payments/verify/${reference}`)
      .then((data) => {
        setInvoice({
          amount: data.amount,
          reference: data.reference,
          plan: data.plan,
          months: data.months,
          period_start: data.period_start,
          period_end: data.period_end,
          already_processed: data.already_processed,
        });
        setStatus('success');
      })
      .catch(() => setStatus('error'));

    // Best-effort: fetch pharmacy name for invoice PDF
    api.get('/pharmacies')
      .then((rows) => setPharmacy(Array.isArray(rows) ? rows[0] : null))
      .catch(() => {});
  }, []);

  const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const downloadInvoice = async () => {
    if (!invoice?.reference) return;
    const period = invoice.period_start && invoice.period_end
      ? `${invoice.period_start} to ${invoice.period_end}`
      : '—';

    const contentHtml = `
      <div>
        <p style="margin:0 0 8px;"><strong>Reference:</strong> ${escapeHtml(invoice.reference)}</p>
        <p style="margin:0 0 8px;"><strong>Amount Paid:</strong> GHS ${escapeHtml(invoice.amount)}</p>
        <p style="margin:0 0 8px;"><strong>Plan:</strong> ${escapeHtml(invoice.plan)}</p>
        <p style="margin:0 0 8px;"><strong>Period Covered:</strong> ${escapeHtml(period)}</p>
        <p style="margin:0;"><strong>Duration:</strong> ${escapeHtml(invoice.months)} month(s)</p>
      </div>
    `;

    await exportReportDocument({
      title: 'Payment Receipt',
      period,
      contentHtml,
      filename: `Payment-Receipt-${invoice.reference}.pdf`,
      pharmacy,
    });
  };

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
              {invoice?.amount != null ? `GHS ${invoice.amount} received. ` : ''}
              Your subscription is now active.
            </p>
            {invoice && (
              <div style={{ marginTop: '14px' }}>
                <p className="login-subtitle" style={{ marginBottom: 6 }}>
                  <strong>Reference:</strong> {invoice.reference}
                </p>
                <p className="login-subtitle" style={{ marginBottom: 6 }}>
                  <strong>Plan:</strong> {invoice.plan?.toUpperCase?.() || invoice.plan}
                </p>
                <p className="login-subtitle" style={{ marginBottom: 6 }}>
                  <strong>Period:</strong>{' '}
                  {invoice.period_start && invoice.period_end
                    ? `${invoice.period_start} → ${invoice.period_end}`
                    : '—'}
                </p>
              </div>
            )}
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate('/app')}
              style={{ marginTop: '16px' }}
            >
              Go to dashboard →
            </button>

            {invoice && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={downloadInvoice}
                style={{ marginTop: '10px' }}
              >
                Download receipt (PDF)
              </button>
            )}
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
