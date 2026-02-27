import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { downloadCSV } from '../../utils/exportCSV';
import Spinner from '../common/Spinner';
import './ReportCommon.css';

export default function SalesByPeriodReport() {
  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [group, setGroup] = useState('day');
  const [loading, setLoading] = useState(true);
  const api = useApi();

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    params.set('group', group);
    api.get(`/reports/sales-by-period?${params}`)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, [group]);

  const maxTotal = Math.max(...(data || []).map((d) => d.total), 1);

  const exportCsv = () => {
    downloadCSV(
      `sales-by-period-${new Date().toISOString().slice(0, 10)}.csv`,
      data,
      [{ key: 'period', header: 'Period' }, { key: 'total', header: 'Total' }, { key: 'count', header: 'Sales Count' }]
    );
  };

  if (loading) return <Spinner label="Loading sales by period…" />;

  return (
    <div className="report-page">
      <div className="report-header">
        <h1>Sales by Period</h1>
        <div className="report-actions">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
          <button className="btn btn-ghost" onClick={fetchReport}>Apply</button>
          <button className="btn btn-primary" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <section className="report-section">
        <h2>Chart</h2>
        <div className="bar-chart">
          {(data || []).map((d) => (
            <div key={d.period} className="bar-chart-row">
              <span className="bar-chart-label">{d.period}</span>
              <div className="bar-chart-track">
                <div
                  className="bar-chart-bar"
                  style={{ width: `${(d.total / maxTotal) * 100}%` }}
                />
              </div>
              <span className="bar-chart-value">₵{parseFloat(d.total).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="report-section">
        <h2>Data</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Total</th>
              <th># Sales</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((d) => (
              <tr key={d.period}>
                <td>{d.period}</td>
                <td>₵{parseFloat(d.total).toFixed(2)}</td>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
