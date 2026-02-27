import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { downloadCSV } from '../../utils/exportCSV';
import Spinner from '../common/Spinner';
import './ReportCommon.css';

export default function SlowMovingReport() {
  const [data, setData] = useState([]);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  const fetchReport = () => {
    setLoading(true);
    api.get(`/reports/slow-moving?days=${days}`)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, [days]);

  const exportCsv = () => {
    downloadCSV(
      `slow-moving-${new Date().toISOString().slice(0, 10)}.csv`,
      data,
      [
        { key: 'drug_name', header: 'Drug' },
        { key: 'quantity_sold', header: 'Quantity Sold' },
      ]
    );
  };

  if (loading) return <Spinner label="Loading slow-moving report…" />;

  return (
    <div className="report-page">
      <div className="report-header">
        <h1>Slow-Moving Items</h1>
        <div className="report-actions">
          <label>Last </label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
          <label> days (≤5 units sold)</label>
          <button className="btn btn-ghost" onClick={fetchReport}>Apply</button>
          <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <section className="report-section">
        <p className="report-description">Items with 5 or fewer units sold in the selected period.</p>
        <table className="report-table">
          <thead>
            <tr>
              <th>Drug</th>
              <th>Quantity Sold</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((d) => (
              <tr key={d.drug_id}>
                <td>{d.drug_name}</td>
                <td>{d.quantity_sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
