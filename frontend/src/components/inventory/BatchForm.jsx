import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './BatchForm.css';

export default function BatchForm({ embedded = false, onStockChanged } = {}) {
  const [drugs, setDrugs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [drugId, setDrugId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const api = useApi();

  useEffect(() => {
    api.get('/inventory/drugs').then(setDrugs).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (drugId) api.get(`/inventory/batches?drug_id=${drugId}`).then(setBatches).catch(console.error);
    else setBatches([]);
  }, [drugId]);

  const handleAddBatch = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      drug_id: form.drug_id.value,
      quantity: +form.quantity.value,
      unit_price: +form.unit_price.value,
      batch_number: form.batch_number.value || undefined,
      expiry_date: form.expiry_date.value,
    };
    try {
      await api.post('/inventory/batches', data);
      form.reset();
      if (drugId) api.get(`/inventory/batches?drug_id=${drugId}`).then(setBatches);
      onStockChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to add batch');
    }
  };

  const handleUpdateQty = async (batchId, newQty) => {
    try {
      await api.put(`/inventory/batches/${batchId}`, { quantity: newQty });
      if (drugId) api.get(`/inventory/batches?drug_id=${drugId}`).then(setBatches);
      onStockChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to update quantity');
    }
  };

  return (
    <div className="batch-form">
      {!embedded && <h1>Add Stock</h1>}

      {error && <p className="error-banner">{error}</p>}

      <form onSubmit={handleAddBatch} className="batch-add-form">
        <label>Drug</label>
        <select name="drug_id" required onChange={(e) => setDrugId(e.target.value)}>
          <option value="">Select drug</option>
          {drugs.map((d) => (
            <option key={d.id} value={d.id}>{d.name} {d.dosage ? `(${d.dosage})` : ''}</option>
          ))}
        </select>
        <label>Quantity</label>
        <input type="number" name="quantity" min="1" required />
        <label>Unit Price</label>
        <input type="number" name="unit_price" step="0.01" min="0" required />
        <label>Batch Number</label>
        <input type="text" name="batch_number" placeholder="Optional" />
        <label>Expiry Date</label>
        <input type="date" name="expiry_date" required />
        <button type="submit" className="btn btn-primary">Add Batch</button>
      </form>

      {drugId && (
        <div className="batch-list">
          <h2>Current Batches (FEFO order)</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="batch-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>{b.batch_number || '-'}</td>
                    <td>{b.expiry_date}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={b.quantity}
                        onBlur={(e) => {
                          const v = +e.target.value;
                          if (v !== b.quantity) handleUpdateQty(b.id, v);
                        }}
                        className="qty-input"
                      />
                    </td>
                    <td>₵{parseFloat(b.unit_price).toFixed(2)}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
