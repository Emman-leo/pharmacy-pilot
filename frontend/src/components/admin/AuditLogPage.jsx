import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import './AuditLogPage.css';

const ACTION_COLORS = {
  CREATE: 'badge-green',
  UPDATE: 'badge-blue',
  CHECKOUT: 'badge-purple',
  APPROVE: 'badge-green',
  REJECT: 'badge-red',
  LOGIN: 'badge-gray',
  REGISTER: 'badge-gray',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function AuditLogPage() {
  const api = useApi();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadLogs = async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const nextOffset = reset ? 0 : offset;
      const data = await api.get(
        `/admin/audit-logs?limit=${limit}&offset=${nextOffset}`,
      );
      if (reset) {
        setLogs(data);
      } else {
        setLogs((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === limit);
      setOffset(nextOffset + data.length);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="audit-page">
      <header className="audit-header">
        <div>
          <h1>Audit Log</h1>
          <p className="audit-subtitle">
            Admin view of key actions performed in the system.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => loadLogs(true)}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && <p className="audit-error">{error}</p>}

      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Details</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="audit-empty">
                  No audit events yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDate(log.created_at)}</td>
                <td>{log.user_id || '—'}</td>
                <td>{log.role || '—'}</td>
                <td>
                  <span
                    className={`audit-badge ${
                      ACTION_COLORS[log.action] || 'badge-gray'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td>{log.resource}</td>
                <td>
                  <pre className="audit-details">
                    {log.details
                      ? JSON.stringify(log.details, null, 2)
                      : '—'}
                  </pre>
                </td>
                <td>{log.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="audit-more">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => loadLogs(false)}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

