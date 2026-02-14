import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './ApprovalQueue.css';

export default function ApprovalQueue() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const api = useApi();

  const fetchPending = () => {
    api.get('/prescriptions/pending')
      .then(setPending)
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchPending();
  }, []);

  const approve = async (id) => {
    setProcessing(id);
    try {
      await api.put(`/prescriptions/${id}/approve`);
      fetchPending();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const reject = async (id) => {
    setRejecting(id);
    try {
      await api.put(`/prescriptions/${id}/reject`, { reason: rejectReason });
      setRejectReason('');
      setRejecting(null);
      fetchPending();
    } catch (err) {
      alert(err.message);
    } finally {
      setRejecting(null);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="approval-queue">
      <h1>Prescription Approval Queue</h1>

      {pending.length === 0 ? (
        <p className="approval-empty">No pending prescriptions</p>
      ) : (
        <div className="approval-list">
          {pending.map((p) => (
            <div key={p.id} className="approval-card">
              <h3>{p.patient_name}</h3>
              <p className="approval-doctor">Doctor: {p.doctor_name}</p>
              {p.patient_age != null && <p>Age: {p.patient_age}</p>}
              {p.patient_weight != null && <p>Weight: {p.patient_weight} kg</p>}
              <div className="approval-drugs">
                <h4>Prescribed Drugs</h4>
                <ul>
                  {(p.prescribed_drugs || []).map((d, i) => (
                    <li key={i}>{d.drug_id} – {d.dosage || '-'} ({d.duration_days || '-'} days)</li>
                  ))}
                </ul>
              </div>
              {p.notes && <p className="approval-notes">Notes: {p.notes}</p>}
              <div className="approval-actions">
                {rejecting === p.id ? (
                  <div className="approval-reject-form">
                    <input
                      type="text"
                      placeholder="Rejection reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="approval-input"
                    />
                    <button className="btn btn-primary" onClick={() => reject(p.id)}>Confirm Reject</button>
                  </div>
                ) : (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => approve(p.id)}
                      disabled={processing === p.id}
                    >
                      {processing === p.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setRejecting(p.id)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
