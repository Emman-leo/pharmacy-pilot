import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Spinner from '../common/Spinner';
import './SalesHistory.css';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const api = useApi();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadSales = async ({ search: searchOverride, startDate: startOverride, endDate: endOverride } = {}) => {
    const effectiveSearch = searchOverride ?? search;
    const effectiveStart = startOverride ?? startDate;
    const effectiveEnd = endOverride ?? endDate;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (effectiveSearch.trim()) params.set('search', effectiveSearch.trim());
      if (effectiveStart) params.set('start_date', effectiveStart);
      if (effectiveEnd) params.set('end_date', effectiveEnd);

      const qs = params.toString();
      const data = await api.get(`/sales/history${qs ? `?${qs}` : ''}`);
      setSales(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load sales history');
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Spinner label="Loading sales history…" />;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div className="sales-history">
      <div className="sales-history-header">
        <h1>Sales History</h1>
        <Link to="/app/sales" className="btn btn-primary">New Sale</Link>
      </div>

      <div className="sales-history-filters">
        <input
          type="text"
          className="sales-history-search"
          placeholder="Search receipt number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="date"
          className="sales-history-date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="sales-history-date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={loadSales}>
          Search
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setSearch('');
            setStartDate('');
            setEndDate('');
            loadSales({ search: '', startDate: '', endDate: '' });
          }}
        >
          Clear
        </button>
      </div>

      <div className="sales-history-table-container">
        <table className="sales-history-table">
          <thead>
            <tr>
              <th>Receipt Number</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr 
                key={sale.id} 
                className={sale.status === 'VOIDED' ? 'voided-row' : ''}
              >
                <td>{sale.receipt_number}</td>
                <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                <td>{sale.customer_name || 'Walk-in'}</td>
                <td>₵{parseFloat(sale.final_amount).toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${sale.status === 'VOIDED' ? 'voided' : 'completed'}`}>
                    {sale.status === 'VOIDED' ? 'Voided' : 'Completed'}
                  </span>
                </td>
                <td>
                  <Link 
                    to={`/app/sales/receipt/${sale.id}`} 
                    className="btn btn-ghost btn-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {sales.length === 0 && (
          <div className="no-sales">
            <p>No sales found</p>
          </div>
        )}
      </div>
    </div>
  );
}
