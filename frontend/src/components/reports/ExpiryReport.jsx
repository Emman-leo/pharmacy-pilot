import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { downloadCSV } from '../../utils/exportCSV';
import Spinner from '../common/Spinner';
import './ExpiryReport.css';

export default function ExpiryReport() {
  const [alerts, setAlerts] = useState([]);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/expiry-alerts?days=${days}`)
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [days]);

  const exportCsv = () => {
    const rows = alerts.map((a) => ({ drug_name: a.drugs?.name || 'Unknown', expiry_date: a.expiry_date, quantity: a.quantity }));
    downloadCSV(`expiry-alerts-${new Date().toISOString().slice(0, 10)}.csv`, rows, [
      { key: 'drug_name', header: 'Drug' },
      { key: 'expiry_date', header: 'Expiry Date' },
      { key: 'quantity', header: 'Quantity' },
    ]);
  };

  if (loading) return <Spinner label="Loading expiry alerts…" />;

  return (
    <div className="expiry-report">
      <h1>Expiry Alerts</h1>

      <div className="expiry-filters">
        <label>Expiring within (days)</label>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))}>
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
          <option value={180}>180 days</option>
        </select>
        <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
      </div>

      {alerts.length === 0 ? (
        <p className="expiry-empty">No items expiring in the selected period</p>
      ) : (
        <table className="expiry-table">
          <thead>
            <tr>
              <th>Drug</th>
              <th>Dosage</th>
              <th>Expiry Date</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td>{a.drugs?.name || 'Unknown'}</td>
                <td>{a.drugs?.dosage || '-'}</td>
                <td>{a.expiry_date}</td>
                <td>{a.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
