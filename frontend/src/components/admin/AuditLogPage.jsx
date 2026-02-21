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

function formatUser(log) {
  if (log.user_name) return log.user_name;
  if (log.user_email) return log.user_email;
  if (log.user_id) return log.user_id.slice(0, 8) + '…';
  return '—';
}

function formatDetails(details) {
  if (!details || typeof details !== 'object') return '—';
  return Object.entries(details)
    .map(([key, value]) => {
      const formattedValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `${key}: ${formattedValue}`;
    })
    .join('\n');
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
      const params = new URLSearchParams({ limit: String(limit), offset: String(nextOffset) });
      const data = await api.get(`/admin/audit-logs?${params}`);
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
              <th>Pharmacy</th>
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
                <td colSpan={8} className="audit-empty">
                  No audit events yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDate(log.created_at)}</td>
                <td>{log.pharmacy_name || '—'}</td>
                <td>{formatUser(log)}</td>
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
                    {formatDetails(log.details)}
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

