import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
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

  if (loading) return <p>Loading...</p>;

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
