import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { downloadCSV } from '../../utils/exportCSV';
import Spinner from '../common/Spinner';
import './ReportCommon.css';

export default function InventoryValuationReport() {
  const [data, setData] = useState({ total: 0, byDrug: [] });
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    setLoading(true);
    api.get('/reports/inventory-valuation')
      .then(setData)
      .catch(() => setData({ total: 0, byDrug: [] }))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    downloadCSV(
      `inventory-valuation-${new Date().toISOString().slice(0, 10)}.csv`,
      data.byDrug || [],
      [
        { key: 'drug_name', header: 'Drug' },
        { key: 'quantity', header: 'Quantity' },
        { key: 'value', header: 'Value' },
      ]
    );
  };

  if (loading) return <Spinner label="Loading inventory valuation…" />;

  const maxVal = Math.max(...(data.byDrug || []).map((d) => d.value), 1);

  return (
    <div className="report-page">
      <div className="report-header">
        <h1>Inventory Valuation</h1>
        <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
      </div>

      <section className="report-section">
        <h2>Total Stock Value</h2>
        <div className="summary-card highlight">
          <span className="summary-value">₵{(data.total || 0).toFixed(2)}</span>
        </div>
      </section>

      <section className="report-section">
        <h2>By Drug</h2>
        <div className="bar-chart">
          {(data.byDrug || []).slice(0, 20).map((d) => (
            <div key={d.drug_id} className="bar-chart-row">
              <span className="bar-chart-label">{d.drug_name}</span>
              <div className="bar-chart-track">
                <div
                  className="bar-chart-bar"
                  style={{ width: `${(d.value / maxVal) * 100}%` }}
                />
              </div>
              <span className="bar-chart-value">₵{parseFloat(d.value).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <table className="report-table">
          <thead>
            <tr>
              <th>Drug</th>
              <th>Quantity</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {(data.byDrug || []).map((d) => (
              <tr key={d.drug_id}>
                <td>{d.drug_name}</td>
                <td>{d.quantity}</td>
                <td>₵{parseFloat(d.value).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
