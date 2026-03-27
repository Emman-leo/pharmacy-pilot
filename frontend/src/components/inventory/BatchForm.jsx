import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';
import './BatchForm.css';

export default function BatchForm({ embedded = false, onStockChanged } = {}) {
  const [drugs, setDrugs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [drugId, setDrugId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Markup state
  const [costPrice, setCostPrice] = useState('');
  const [markup, setMarkup] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const api = useApi();
  const { isAdmin } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get('/inventory/drugs'),
      api.get('/suppliers'),
    ])
      .then(([drugsData, suppliersData]) => {
        setDrugs(drugsData);
        setSuppliers(suppliersData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (drugId) api.get(`/inventory/batches?drug_id=${drugId}`).then(setBatches).catch(console.error);
    else setBatches([]);
  }, [drugId]);

  // Auto-calculate selling price when cost or markup changes
  const handleCostChange = (e) => {
    const cost = e.target.value;
    setCostPrice(cost);
    if (cost && markup) {
      const calculated = parseFloat(cost) * (1 + parseFloat(markup) / 100);
      setSellingPrice(calculated.toFixed(2));
    }
  };

  const handleMarkupChange = (e) => {
    const m = e.target.value;
    setMarkup(m);
    if (costPrice && m) {
      const calculated = parseFloat(costPrice) * (1 + parseFloat(m) / 100);
      setSellingPrice(calculated.toFixed(2));
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      drug_id: form.drug_id.value,
      quantity: +form.quantity.value,
      cost_price: +costPrice,
      selling_price: +sellingPrice,
      batch_number: form.batch_number.value || undefined,
      expiry_date: form.expiry_date.value,
      supplier_id: form.supplier_id.value || undefined,
      supplier_invoice: form.supplier_invoice.value || undefined,
    };
    try {
      await api.post('/inventory/batches', data);
      form.reset();
      setCostPrice('');
      setMarkup('');
      setSellingPrice('');
      if (drugId) api.get(`/inventory/batches?drug_id=${drugId}`).then(setBatches);
      onStockChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to add batch');
    }
  };

  const handleUpdateBatch = async (batchId, patch) => {
    try {
      await api.put(`/inventory/batches/${batchId}`, patch);
      if (drugId) api.get(`/inventory/batches?drug_id=${drugId}`).then(setBatches);
      onStockChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to update batch');
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

        <label>Cost Price (GHS) *</label>
        <input
          type="number"
          name="cost_price"
          step="0.01"
          min="0"
          placeholder="What you paid the supplier"
          value={costPrice}
          onChange={handleCostChange}
          required
        />

        <label>Markup (%)</label>
        <input
          type="number"
          name="markup"
          step="0.1"
          min="0"
          placeholder="e.g. 30 for 30%"
          value={markup}
          onChange={handleMarkupChange}
        />

        <label>Selling Price (GHS) *</label>
        <input
          type="number"
          name="selling_price"
          step="0.01"
          min="0"
          placeholder="Auto-calculated or enter manually"
          value={sellingPrice}
          onChange={(e) => setSellingPrice(e.target.value)}
          required
        />

        <label>Supplier</label>
        <select name="supplier_id">
          <option value="">Select supplier (optional)</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <label>Supplier Invoice No.</label>
        <input
          type="text"
          name="supplier_invoice"
          placeholder="e.g. INV-2024-001 (optional)"
        />

        <label>Batch Number</label>
        <input type="text" name="batch_number" placeholder="Optional" />

        <label>Expiry Date</label>
        <input type="date" name="expiry_date" required />

        <button type="submit" className="btn btn-primary">Add Batch</button>
      </form>

      {!drugId && (
        <p className="batch-manage-hint">
          Select a drug above to view and manage its existing batches.
        </p>
      )}

      {drugId && (
        <div className="batch-list">
          <h2>Current Batches (FEFO order)</h2>
          {loading ? (
            <Spinner label="Loading batches…" />
          ) : (
            <table className="batch-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Quantity</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {isAdmin ? (
                        <input
                          type="text"
                          defaultValue={b.batch_number || ''}
                          className="qty-input"
                          onBlur={(e) => handleUpdateBatch(b.id, { batch_number: e.target.value || null })}
                        />
                      ) : (
                        b.batch_number || '-'
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <input
                          type="date"
                          defaultValue={b.expiry_date || ''}
                          className="qty-input"
                          onBlur={(e) => handleUpdateBatch(b.id, { expiry_date: e.target.value || null })}
                        />
                      ) : (
                        b.expiry_date || '-'
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        defaultValue={b.quantity}
                        disabled={!isAdmin}
                        onBlur={(e) => {
                          const v = +e.target.value;
                          if (Number.isFinite(v) && v !== b.quantity) {
                            handleUpdateBatch(b.id, { quantity: v });
                          }
                        }}
                        className="qty-input"
                      />
                    </td>
                    <td>
                      {isAdmin ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={b.cost_price ?? 0}
                          className="qty-input"
                          onBlur={(e) => {
                            const v = e.target.value;
                            handleUpdateBatch(b.id, { cost_price: v === '' ? null : v });
                          }}
                        />
                      ) : (
                        `₵${parseFloat(b.cost_price).toFixed(2)}`
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={b.selling_price ?? 0}
                          className="qty-input"
                          onBlur={(e) => {
                            const v = e.target.value;
                            handleUpdateBatch(b.id, { selling_price: v === '' ? null : v });
                          }}
                        />
                      ) : (
                        `₵${parseFloat(b.selling_price).toFixed(2)}`
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            // eslint-disable-next-line no-alert
                            if (window.confirm('Delete this batch? This cannot be undone.')) {
                              api
                                .delete(`/inventory/batches/${b.id}`)
                                .then(() => {
                                  if (drugId) api.get(`/inventory/batches?drug_id=${drugId}`).then(setBatches);
                                  onStockChanged?.();
                                })
                                .catch((err) => setError(err.message || 'Failed to delete batch'));
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
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
