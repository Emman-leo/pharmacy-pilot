import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { downloadCSV } from '../../utils/exportCSV';
import Spinner from '../common/Spinner';
import './SalesReport.css';

export default function SalesReport() {
  const [summary, setSummary] = useState({ total: 0, count: 0, sales: [] });
  const [topSelling, setTopSelling] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const api = useApi();

  const fetchReports = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    Promise.all([
      api.get(`/reports/sales-summary?${params}`),
      api.get('/reports/top-selling?limit=10'),
    ])
      .then(([s, t]) => {
        setSummary(s);
        setTopSelling(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const exportCsv = () => {
    downloadCSV(
      `sales-report-${new Date().toISOString().slice(0, 10)}.csv`,
      topSelling || [],
      [{ key: 'drug_name', header: 'Drug' }, { key: 'quantity', header: 'Quantity Sold' }]
    );
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) return <Spinner label="Loading sales report…" />;

  return (
    <div className="sales-report">
      <h1>Sales Report</h1>

      <div className="report-filters">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn btn-primary" onClick={fetchReports}>Apply</button>
        <button className="btn btn-ghost" onClick={exportCsv}>Export CSV</button>
      </div>

      <section className="report-section">
        <h2>Summary</h2>
        <div className="report-summary">
          <div className="summary-item">
            <span className="summary-value">₵{(summary.total || 0).toFixed(2)}</span>
            <span className="summary-label">Total Revenue</span>
          </div>
          <div className="summary-item">
            <span className="summary-value">{summary.count || 0}</span>
            <span className="summary-label">Total Sales</span>
          </div>
        </div>
      </section>

      <section className="report-section">
        <h2>Top Selling Drugs</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Drug</th>
              <th>Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            {(topSelling || []).map((t, i) => (
              <tr key={t.drug_id || i}>
                <td>{t.drug_name || 'Unknown'}</td>
                <td>{t.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
