import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import Spinner from '../common/Spinner';
import './SuppliersPage.css';

export default function SuppliersPage() {
  const api = useApi();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/suppliers');
      setSuppliers(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/suppliers', { name, phone, address });
      setName('');
      setPhone('');
      setAddress('');
      setSuccess('Supplier added successfully.');
      load();
    } catch (err) {
      setError(err.message || 'Failed to add supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="suppliers-page">
      <header className="suppliers-header">
        <div>
          <h1>Suppliers</h1>
          <p className="suppliers-subtitle">Manage your drug suppliers.</p>
        </div>
      </header>

      <div className="suppliers-layout">
        <section className="suppliers-form-section">
          <h2>Add Supplier</h2>
          {error && <p className="error-banner">{error}</p>}
          {success && <p className="success-banner">{success}</p>}
          <form onSubmit={handleSubmit} className="suppliers-form">
            <label>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pharmanova Ltd"
              required
            />
            <label>Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0244000000"
            />
            <label>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Accra Central"
            />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Supplier'}
            </button>
          </form>
        </section>

        <section className="suppliers-list-section">
          <h2>All Suppliers</h2>
          {loading ? (
            <Spinner label="Loading suppliers…" />
          ) : suppliers.length === 0 ? (
            <p className="suppliers-empty">No suppliers added yet.</p>
          ) : (
            <table className="suppliers-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="supplier-name">{s.name}</td>
                    <td>{s.phone || '-'}</td>
                    <td>{s.address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
