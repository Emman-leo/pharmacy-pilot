import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import './Accounting.css';

const CATEGORIES = [
  { value: 'rent',          label: 'Rent' },
  { value: 'salaries',      label: 'Salaries' },
  { value: 'utilities',     label: 'Utilities' },
  { value: 'transport',     label: 'Transport' },
  { value: 'licenses',      label: 'Licenses' },
  { value: 'maintenance',   label: 'Maintenance' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const today = () => new Date().toISOString().slice(0, 10);

const fmt = (n) => `₵${Number(n || 0).toFixed(2)}`;

export default function ExpensesPage() {
  const api = useApi();
  const { isAdmin } = useAuth();

  // Form state
  const [amount,        setAmount]        = useState('');
  const [category,      setCategory]      = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description,   setDescription]   = useState('');
  const [expenseDate,   setExpenseDate]   = useState(today());
  const [staffId,       setStaffId]       = useState('');
  const [staffName,     setStaffName]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [formError,     setFormError]     = useState('');
  const [formSuccess,   setFormSuccess]   = useState('');

  // Staff list (for salary entries)
  const [staffList, setStaffList] = useState([]);

  // List state
  const [expenses,    setExpenses]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterCat,   setFilterCat]   = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd,   setFilterEnd]   = useState('');
  const [deleting,    setDeleting]    = useState(null);

  const fetchStaff = useCallback(async () => {
    try {
      const data = await api.get('/auth/users');
      setStaffList(data || []);
    } catch {
      setStaffList([]);
    }
  }, [api]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat)   params.set('category',   filterCat);
      if (filterStart) params.set('start_date',  filterStart);
      if (filterEnd)   params.set('end_date',    filterEnd);
      const data = await api.get(`/accounting/expenses?${params}`);
      setExpenses(data || []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [api, filterCat, filterStart, filterEnd]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { fetchStaff(); },   [fetchStaff]);

  const handleSubmit = async () => {
    setFormError('');
    setFormSuccess('');
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return setFormError('Enter a valid amount');
    }
    if (!category)      return setFormError('Select a category');
    if (!paymentMethod) return setFormError('Select a payment method');

    setSubmitting(true);
    try {
      await api.post('/accounting/expenses', {
        amount:         parseFloat(amount),
        category,
        payment_method: paymentMethod,
        description:    description || undefined,
        expense_date:   expenseDate,
        staff_id:       staffId   || undefined,
        staff_name:     staffName || undefined,
      });
      setFormSuccess('Expense recorded');
      setAmount('');
      setCategory('');
      setPaymentMethod('');
      setDescription('');
      setExpenseDate(today());
      setStaffId('');
      setStaffName('');
      fetchExpenses();
    } catch (err) {
      setFormError(err.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    setDeleting(id);
    try {
      await api.delete(`/accounting/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const totalFiltered = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  return (
    <div className="accounting-page">
      <header className="accounting-header">
        <h1>Expenses</h1>
        <p className="accounting-subtitle">Record and track all pharmacy outgoings</p>
      </header>

      {/* Add Expense Form */}
      <div className="accounting-card">
        <h2 className="accounting-card-title">Record Expense</h2>

        {formError   && <div className="acct-error">{formError}</div>}
        {formSuccess  && <div className="acct-success">{formSuccess}</div>}

        <div className="expense-form-grid">
          <div className="form-group">
            <label>Amount (GHS) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="acct-input"
            />
          </div>

          <div className="form-group">
            <label>Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="acct-input"
            >
              <option value="">Select category</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Payment Method *</label>
            <div className="payment-toggle">
              <button
                type="button"
                className={`payment-toggle-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                💵 Cash
              </button>
              <button
                type="button"
                className={`payment-toggle-btn ${paymentMethod === 'momo' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('momo')}
              >
                📱 MoMo
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              className="acct-input"
            />
          </div>

          <div className="form-group form-group-full">
            <label>Description</label>
            <input
              type="text"
              placeholder="Optional note"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="acct-input"
            />
          </div>

          {/* Salary-specific fields */}
          {category === 'salaries' && (
            <>
              <div className="form-group">
                <label>Staff Member</label>
                <select
                  value={staffId}
                  onChange={e => {
                    setStaffId(e.target.value);
                    setStaffName('');
                  }}
                  className="acct-input"
                >
                  <option value="">Select staff (optional)</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.email}
                    </option>
                  ))}
                </select>
              </div>
              {!staffId && (
                <div className="form-group">
                  <label>Or type a name</label>
                  <input
                    type="text"
                    placeholder="Staff name"
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    className="acct-input"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Record Expense'}
        </button>
      </div>

      {/* Filters + List */}
      <div className="accounting-card">
        <div className="expense-list-header">
          <h2 className="accounting-card-title">Expense History</h2>
          <div className="expense-filters">
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="acct-input acct-input-sm"
            >
              <option value="">All categories</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={filterStart}
              onChange={e => setFilterStart(e.target.value)}
              className="acct-input acct-input-sm"
            />
            <input
              type="date"
              value={filterEnd}
              onChange={e => setFilterEnd(e.target.value)}
              className="acct-input acct-input-sm"
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={fetchExpenses}
            >
              Apply
            </button>
          </div>
        </div>

        {loading ? (
          <p className="acct-loading">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="acct-empty">No expenses found.</p>
        ) : (
          <>
            <div className="expense-total-row">
              <span>Total</span>
              <span className="expense-total-amount">{fmt(totalFiltered)}</span>
            </div>
            <div className="expense-table-wrap">
              <table className="acct-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Method</th>
                    <th>Staff</th>
                    <th>Amount</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td>{e.expense_date}</td>
                      <td>
                        <span className={`category-badge category-${e.category}`}>
                          {CATEGORIES.find(c => c.value === e.category)?.label || e.category}
                        </span>
                      </td>
                      <td className="acct-desc">{e.description || '—'}</td>
                      <td>
                        <span className={`method-badge method-${e.payment_method}`}>
                          {e.payment_method === 'cash' ? '💵 Cash' : '📱 MoMo'}
                        </span>
                      </td>
                      <td>
                        {e.profiles?.full_name || e.profiles?.email || e.staff_name || '—'}
                      </td>
                      <td className="acct-amount">{fmt(e.amount)}</td>
                      {isAdmin && (
                        <td>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => handleDelete(e.id)}
                            disabled={deleting === e.id}
                          >
                            {deleting === e.id ? '…' : '✕'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
