import { IconCalendar, IconAlert } from './icons';
import './ReportsPage.css';

const QUICK_REPORTS = [
  { id: 'daily', label: 'Daily Summary', reportType: 'sales-summary', period: 'today' },
  { id: 'weekly', label: 'Weekly Overview', reportType: 'sales-summary', period: 'week' },
  { id: 'low-stock', label: 'Low Stock Items', reportType: 'low-stock', period: 'month' },
  { id: 'expiring', label: 'Expiring Soon', reportType: 'expiry', period: 'month' },
];

export default function QuickReports({ onSelect }) {
  return (
    <section className="reports-quick">
      <h2>Quick Reports</h2>
      <p className="reports-quick-desc">Click a card to set report type and period, then generate.</p>
      <div className="quick-cards">
        {QUICK_REPORTS.map((q) => (
          <button
            key={q.id}
            type="button"
            className="quick-card"
            onClick={() => onSelect(q.reportType, q.period)}
          >
            <span className="quick-card-icon">
              {q.id === 'daily' || q.id === 'weekly' ? <IconCalendar /> : <IconAlert />}
            </span>
            <span className="quick-card-label">{q.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
