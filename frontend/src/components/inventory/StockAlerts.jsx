import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './StockAlerts.css';

export default function StockAlerts() {
  const [alerts, setAlerts] = useState({ lowStock: [], expiryWarnings: [] });
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    api.get('/inventory/alerts')
      .then(setAlerts)
      .catch(() => setAlerts({ lowStock: [], expiryWarnings: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  const { lowStock = [], expiryWarnings = [] } = alerts;

  return (
    <div className="stock-alerts">
      <h1>Stock Alerts</h1>

      <section className="alert-section">
        <h2>Low Stock</h2>
        {lowStock.length === 0 ? (
          <p className="alert-empty">No low stock alerts</p>
        ) : (
          <ul className="alert-list">
            {lowStock.map((a) => (
              <li key={a.drug_id} className="alert-item low">
                <span className="alert-drug">{a.drug_name}</span>
                <span className="alert-value">Current: {a.current} (min: {a.min})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="alert-section">
        <h2>Expiring Soon (90 days)</h2>
        {expiryWarnings.length === 0 ? (
          <p className="alert-empty">No expiry warnings</p>
        ) : (
          <ul className="alert-list">
            {expiryWarnings.map((a) => (
              <li key={a.batch_id} className="alert-item expiry">
                <span className="alert-drug">{a.drug_name}</span>
                <span className="alert-value">Expires: {a.expiry_date} | Qty: {a.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
