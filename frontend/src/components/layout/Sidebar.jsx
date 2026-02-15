import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/inventory/drugs', label: 'Drugs' },
  { to: '/inventory/batches', label: 'Add Stock' },
  { to: '/inventory/alerts', label: 'Alerts' },
  { to: '/sales', label: 'Point of Sale' },
  { to: '/prescriptions', label: 'Prescriptions' },
  { to: '/prescriptions/approval', label: 'Approval Queue', adminOnly: true },
  { to: '/reports/sales', label: 'Sales Report' },
  { to: '/reports/expiry', label: 'Expiry Report' },
  { to: '/reports/profit', label: 'Profit Margin' },
  { to: '/reports/sales-by-period', label: 'Sales by Period' },
  { to: '/reports/valuation', label: 'Inventory Valuation' },
  { to: '/reports/slow-moving', label: 'Slow-Moving Items' },
];

export default function Sidebar() {
  const { isAdmin } = useAuth();
  const items = navItems.filter((i) => !i.adminOnly || isAdmin);
  return (
    <aside className="sidebar">
      <nav>
        {items.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
