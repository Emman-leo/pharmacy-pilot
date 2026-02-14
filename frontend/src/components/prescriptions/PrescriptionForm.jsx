import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './PrescriptionForm.css';

export default function PrescriptionForm() {
  const [drugs, setDrugs] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientWeight, setPatientWeight] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [prescribedDrugs, setPrescribedDrugs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const api = useApi();

  useEffect(() => {
    api.get('/inventory/drugs').then(setDrugs).catch(console.error);
  }, []);

  const [addDrugId, setAddDrugId] = useState('');
  const [addDosage, setAddDosage] = useState('');
  const [addDuration, setAddDuration] = useState('7');

  const addDrug = () => {
    const drug = drugs.find((d) => d.id === addDrugId);
    if (!drug) {
      alert('Select a drug');
      return;
    }
    if (prescribedDrugs.some((p) => p.drug_id === drug.id)) {
      alert('Drug already added');
      return;
    }
    setPrescribedDrugs((prev) => [
      ...prev,
      { drug_id: drug.id, drug_name: drug.name, dosage: addDosage, duration_days: parseInt(addDuration, 10) || 7 },
    ]);
    setAddDrugId('');
    setAddDosage('');
    setAddDuration('7');
  };

  const removeDrug = (idx) => {
    setPrescribedDrugs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName || !doctorName || prescribedDrugs.length === 0) {
      alert('Patient name, doctor name, and at least one drug required');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const data = {
        patient_name: patientName,
        patient_age: patientAge ? parseInt(patientAge, 10) : undefined,
        patient_weight: patientWeight ? parseFloat(patientWeight) : undefined,
        doctor_name: doctorName,
        prescribed_drugs: prescribedDrugs.map((p) => ({
          drug_id: p.drug_id,
          dosage: p.dosage,
          duration_days: p.duration_days,
        })),
        notes: notes || undefined,
      };
      await api.post('/prescriptions', data);
      setPatientName('');
      setPatientAge('');
      setPatientWeight('');
      setDoctorName('');
      setNotes('');
      setPrescribedDrugs([]);
      setMessage('Prescription submitted successfully.');
    } catch (err) {
      const msg = err.message || 'Submission failed';
      if (err.data?.issues) setMessage(msg + ': ' + JSON.stringify(err.data.issues));
      else setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="prescription-form">
      <h1>New Prescription</h1>

      <form onSubmit={handleSubmit} className="rx-form">
        <div className="rx-row">
          <label>Patient Name *</label>
          <input value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
        </div>
        <div className="rx-row rx-row-2">
          <label>Patient Age</label>
          <input type="number" min="0" max="150" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="Years" />
          <label>Patient Weight (kg)</label>
          <input type="number" min="0" step="0.1" value={patientWeight} onChange={(e) => setPatientWeight(e.target.value)} placeholder="kg" />
        </div>
        <div className="rx-row">
          <label>Doctor Name *</label>
          <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} required />
        </div>

        <div className="rx-drugs">
          <h3>Prescribed Drugs</h3>
          <div className="rx-add-row">
            <select value={addDrugId} onChange={(e) => setAddDrugId(e.target.value)} className="rx-select">
              <option value="">Select drug</option>
              {drugs.map((d) => (
                <option key={d.id} value={d.id}>{d.name} {d.dosage ? `(${d.dosage})` : ''}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Dosage"
              value={addDosage}
              onChange={(e) => setAddDosage(e.target.value)}
              className="rx-input-sm"
            />
            <input
              type="number"
              placeholder="Days"
              value={addDuration}
              onChange={(e) => setAddDuration(e.target.value)}
              min="1"
              className="rx-input-num"
            />
            <button type="button" className="btn btn-ghost" onClick={addDrug}>+ Add</button>
          </div>
          <ul className="rx-list">
            {prescribedDrugs.map((p, i) => (
              <li key={i} className="rx-item">
                <span>{p.drug_name} – {p.dosage || '-'} ({p.duration_days}d)</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeDrug(i)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rx-row">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional notes" />
        </div>

        {message && <p className={message.includes('success') ? 'rx-success' : 'rx-error'}>{message}</p>}
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Submitting...' : 'Submit Prescription'}
        </button>
      </form>
    </div>
  );
}
