import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import './Accounting.css';

const fmt   = (n) => `₵${Number(n || 0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);

export default function DailyClosePage() {
  const api = useApi();

  const [date,        setDate]        = useState(today());
  const [preview,     setPreview]     = useState(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [actualCash,  setActualCash]  = useState('');
  const [notes,       setNotes]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');

  const [history,      setHistory]      = useState([]);
  const [loadingHist,  setLoadingHist]  = useState(true);
  const [activeTab,    setActiveTab]    = useState('close'); // 'close' | 'history'

  const fetchPreview = useCallback(async () => {
    setLoadingPrev(true);
    setError('');
    setSuccess('');
    setActualCash('');
    try {
      const data = await api.get(`/accounting/daily-close/preview?date=${date}`);
      setPreview(data);
    } catch (err) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoadingPrev(false);
    }
  }, [api, date]);

  const fetchHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const data = await api.get('/accounting/daily-close/history');
      setHistory(data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHist(false);
    }
  }, [api]);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const discrepancy = preview && actualCash !== ''
    ? parseFloat(actualCash) - preview.expected_cash
    : null;

  const handleSubmit = async () => {
    if (!actualCash || isNaN(parseFloat(actualCash))) {
      return setError('Enter the actual cash counted');
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/accounting/daily-close', {
        date,
        actual_cash: parseFloat(actualCash),
        notes:       notes || undefined,
      });
      setSuccess(`${date} successfully closed.`);
      setActualCash('');
      setNotes('');
      fetchPreview();
      fetchHistory();
    } catch (err) {
      setError(err.message || 'Failed to submit daily close');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="accounting-page">
      <header className="accounting-header">
        <h1>Daily Close</h1>
        <p className="accounting-subtitle">Reconcile your cash drawer at end of day</p>
      </header>

      <div className="acct-tabs">
        <button
          type="button"
          className={`acct-tab ${activeTab === 'close' ? 'active' : ''}`}
          onClick={() => setActiveTab('close')}
        >
          Close Day
        </button>
        <button
          type="button"
          className={`acct-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'close' && (
        <div className="accounting-card">
          <div className="daily-close-date-row">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="acct-input"
            />
          </div>

          {error   && <div className="acct-error">{error}</div>}
          {success && <div className="acct-success">{success}</div>}

          {loadingPrev ? (
            <p className="acct-loading">Loading figures…</p>
          ) : preview ? (
            <>
              {preview.already_closed ? (
                <div className="acct-already-closed">
                  ✅ This day has already been closed.
                  <div className="close-figures">
                    <div className="close-figure">
                      <span>Cash Sales</span>
                      <strong>{fmt(preview.cash_sales)}</strong>
                    </div>
                    <div className="close-figure">
                      <span>MoMo Sales</span>
                      <strong>{fmt(preview.momo_sales)}</strong>
                    </div>
                    <div className="close-figure">
                      <span>Cash Expenses</span>
                      <strong className="negative">{fmt(preview.total_expenses_cash)}</strong>
                    </div>
                    <div className="close-figure">
                      <span>Expected Cash</span>
                      <strong>{fmt(preview.expected_cash)}</strong>
                    </div>
                    <div className="close-figure">
                      <span>Actual Cash</span>
                      <strong>{fmt(preview.actual_cash)}</strong>
                    </div>
                    <div className="close-figure close-figure-highlight">
                      <span>Discrepancy</span>
                      <strong className={preview.discrepancy >= 0 ? 'positive' : 'negative'}>
                        {preview.discrepancy >= 0 ? '+' : ''}{fmt(preview.discrepancy)}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="close-figures">
                    <div className="close-figure">
                      <span>Cash Sales</span>
                      <strong>{fmt(preview.cash_sales)}</strong>
                    </div>
                    <div className="close-figure">
                      <span>MoMo Sales</span>
                      <strong>{fmt(preview.momo_sales)}</strong>
                    </div>
                    <div className="close-figure">
                      <span>Total Sales</span>
                      <strong>{fmt(preview.total_sales)}</strong>
                    </div>
                    <div className="close-figure">
                      <span>Cash Expenses</span>
                      <strong className="negative">{fmt(preview.total_expenses_cash)}</strong>
                    </div>
                    <div className="close-figure close-figure-highlight">
                      <span>Expected Cash in Drawer</span>
                      <strong>{fmt(preview.expected_cash)}</strong>
                    </div>
                  </div>

                  <div className="close-actual-row">
                    <div className="form-group">
                      <label>Actual Cash Counted (GHS)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={actualCash}
                        onChange={e => setActualCash(e.target.value)}
                        className="acct-input acct-input-large"
                      />
                    </div>

                    {discrepancy !== null && (
                      <div className={`discrepancy-badge ${discrepancy >= 0 ? 'surplus' : 'shortage'}`}>
                        <span className="discrepancy-label">
                          {discrepancy === 0 ? 'Exact match' : discrepancy > 0 ? 'Surplus' : 'Shortage'}
                        </span>
                        <span className="discrepancy-amount">
                          {discrepancy >= 0 ? '+' : ''}{fmt(discrepancy)}
                        </span>
                        {discrepancy !== 0 && (
                          <span className="discrepancy-hint">
                            {discrepancy > 0
                              ? 'More cash than expected — check for unrecorded expenses'
                              : 'Less cash than expected — check for missing sales or unrecorded expenses'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Notes (optional)</label>
                    <textarea
                      placeholder="Any notes about discrepancies or end of day observations"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="acct-input acct-textarea"
                      rows={3}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={submitting || !actualCash}
                  >
                    {submitting ? 'Closing…' : `Close ${date}`}
                  </button>
                </>
              )}
            </>
          ) : null}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="accounting-card">
          <h2 className="accounting-card-title">Close History</h2>
          {loadingHist ? (
            <p className="acct-loading">Loading…</p>
          ) : history.length === 0 ? (
            <p className="acct-empty">No days closed yet.</p>
          ) : (
            <div className="expense-table-wrap">
              <table className="acct-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Cash Sales</th>
                    <th>MoMo Sales</th>
                    <th>Total Sales</th>
                    <th>Cash Expenses</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Discrepancy</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td>{h.close_date}</td>
                      <td>{fmt(h.cash_sales)}</td>
                      <td>{fmt(h.momo_sales)}</td>
                      <td><strong>{fmt(h.total_sales)}</strong></td>
                      <td className="negative">{fmt(h.total_expenses_cash)}</td>
                      <td>{fmt(h.expected_cash)}</td>
                      <td>{fmt(h.actual_cash)}</td>
                      <td>
                        <span className={`discrepancy-cell ${h.discrepancy >= 0 ? 'surplus' : 'shortage'}`}>
                          {h.discrepancy >= 0 ? '+' : ''}{fmt(h.discrepancy)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
