import { IconMoney, IconTrending, IconPackage, IconGrid } from './icons';
import './ReportsPage.css';

export default function StatsCards({ overview, loading }) {
  if (loading) {
    return (
      <section className="reports-stats">
        <div className="reports-stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card loading" />
          ))}
        </div>
      </section>
    );
  }

  const o = overview || {};
  const cards = [
    {
      label: "Today's Sales",
      value: `₵${(o.todaySales ?? 0).toFixed(2)}`,
      icon: <IconMoney />,
      className: 'stat-card',
    },
    {
      label: "This Month's Sales",
      value: `₵${(o.monthSales ?? 0).toFixed(2)}`,
      icon: <IconTrending />,
      className: 'stat-card',
    },
    {
      label: 'Best-Selling Product',
      value: o.bestSelling?.name ?? '—',
      sub: o.bestSelling?.quantity != null ? `${o.bestSelling.quantity} units sold` : null,
      icon: <IconPackage />,
      className: 'stat-card',
    },
    {
      label: 'Active Products',
      value: String(o.activeProductsCount ?? 0),
      sub: 'with stock',
      icon: <IconGrid />,
      className: 'stat-card',
    },
  ];

  return (
    <section className="reports-stats">
      <div className="reports-stats-grid">
        {cards.map((c) => (
          <div key={c.label} className={c.className}>
            <span className="stat-icon">{c.icon}</span>
            <div className="stat-content">
              <span className="stat-value">{c.value}</span>
              <span className="stat-label">{c.label}</span>
              {c.sub && <span className="stat-sub">{c.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
