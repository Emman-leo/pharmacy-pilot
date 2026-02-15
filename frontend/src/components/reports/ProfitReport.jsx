import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { downloadCSV } from '../../utils/exportCSV';
import './ReportCommon.css';

export default function ProfitReport() {
  const [data, setData] = useState({ items: [], totalRevenue: 0, totalCost: 0, totalProfit: 0 });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const api = useApi();

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    api.get(`/reports/profit-margin?${params}`)
      .then(setData)
      .catch(() => setData({ items: [], totalRevenue: 0, totalCost: 0, totalProfit: 0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const exportCsv = () => {
    downloadCSV(
      `profit-margin-${new Date().toISOString().slice(0, 10)}.csv`,
      data.items,
      [
        { key: 'drug_name', header: 'Drug' },
        { key: 'revenue', header: 'Revenue' },
        { key: 'cost', header: 'Cost' },
        { key: 'profit', header: 'Profit' },
        { key: 'margin_pct', header: 'Margin %' },
      ]
    );
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="report-page">
      <div className="report-header">
        <h1>Profit Margin Report</h1>
        <div className="report-actions">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button className="btn btn-ghost" onClick={fetchReport}>Apply</button>
          <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <section className="report-section">
        <h2>Summary</h2>
        <div className="report-summary-grid">
          <div className="summary-card">
            <span className="summary-value">${(data.totalRevenue || 0).toFixed(2)}</span>
            <span className="summary-label">Total Revenue</span>
          </div>
          <div className="summary-card">
            <span className="summary-value">${(data.totalCost || 0).toFixed(2)}</span>
            <span className="summary-label">Total Cost</span>
          </div>
          <div className="summary-card highlight">
            <span className="summary-value">${(data.totalProfit || 0).toFixed(2)}</span>
            <span className="summary-label">Total Profit</span>
          </div>
        </div>
      </section>

      <section className="report-section">
        <h2>By Drug</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Drug</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
              <th>Margin %</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((r) => (
              <tr key={r.drug_id}>
                <td>{r.drug_name}</td>
                <td>${parseFloat(r.revenue).toFixed(2)}</td>
                <td>${parseFloat(r.cost).toFixed(2)}</td>
                <td>${parseFloat(r.profit).toFixed(2)}</td>
                <td>{r.margin_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
