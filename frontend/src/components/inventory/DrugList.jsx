import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';
import './DrugList.css';

const DRUG_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection',
  'Cream', 'Ointment', 'Drops', 'Inhaler', 'Suppository',
  'Patch', 'Gel', 'Lotion', 'Powder', 'Solution', 'Other',
];

export default function DrugList() {
  const [drugs, setDrugs] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const api = useApi();
  const { isAdmin } = useAuth();

  const fetchDrugs = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    api.get(`/inventory/drugs?${params}`)
      .then(setDrugs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchDrugs();
  }, [search, category]);

  const handleSubmit = async (e, data) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/inventory/drugs/${editing.id}`, data);
      } else {
        await api.post('/inventory/drugs', data);
      }
      setFormOpen(false);
      setEditing(null);
      fetchDrugs();
    } catch (err) {
      setError(err.message || 'Failed to save drug');
    }
  };

  return (
    <div className="drug-list">
      <div className="drug-list-header">
        <h1>Drugs</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setFormOpen(true); setEditing(null); }}>
            Add Drug
          </button>
        )}
      </div>

      {error && <p className="error-banner">{error}</p>}

      <div className="drug-list-filters">
        <input
          type="text"
          placeholder="Search drugs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="drug-search"
        />
        <input
          type="text"
          placeholder="Category filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="drug-category"
        />
      </div>

      {loading ? (
        <Spinner label="Loading drugs…" />
      ) : (
        <table className="drug-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Generic</th>
              <th>Strength</th>
              <th>Form</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Min Stock</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {drugs.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.generic_name || '-'}</td>
                <td>{d.dosage || '-'}</td>
                <td>{d.drug_form || '-'}</td>
                <td>{d.category || '-'}</td>
                <td>{d.unit}</td>
                <td>{d.min_stock_quantity}</td>
                {isAdmin && (
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(d); setFormOpen(true); }}>
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formOpen && (
        <DrugForm
          drug={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function DrugForm({ drug, onClose, onSubmit }) {
  const [name, setName] = useState(drug?.name || '');
  const [generic_name, setGenericName] = useState(drug?.generic_name || '');
  const [dosage, setDosage] = useState(drug?.dosage || '');
  const [drug_form, setDrugForm] = useState(drug?.drug_form || '');
  const [category, setCategory] = useState(drug?.category || '');
  const [unit, setUnit] = useState(drug?.unit || 'pcs');
  const [min_stock_quantity, setMinStock] = useState(drug?.min_stock_quantity ?? 10);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{drug ? 'Edit Drug' : 'Add Drug'}</h2>
        <form onSubmit={(e) => onSubmit(e, { name, generic_name, dosage, drug_form, category, unit, min_stock_quantity })}>
          <label>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <label>Generic Name</label>
          <input value={generic_name} onChange={(e) => setGenericName(e.target.value)} />
          <label>Strength</label>
          <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 500mg" />
          <label>Form</label>
          <select value={drug_form} onChange={(e) => setDrugForm(e.target.value)}>
            <option value="">Select form</option>
            {DRUG_FORMS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <label>Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Antibiotic" />
          <label>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="pcs">Pieces</option>
            <option value="bottle">Bottle</option>
            <option value="box">Box</option>
            <option value="ml">ml</option>
          </select>
          <label>Min Stock Quantity</label>
          <input type="number" min="0" value={min_stock_quantity} onChange={(e) => setMinStock(+e.target.value)} />
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
