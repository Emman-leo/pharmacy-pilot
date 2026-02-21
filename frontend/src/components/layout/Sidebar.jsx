import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const navItems = [
  { to: '/app', label: 'Dashboard' },
  { to: '/app/inventory', label: 'Inventory' },
  { to: '/app/inventory/drugs', label: 'Drugs' },
  { to: '/app/inventory/alerts', label: 'Alerts' },
  { to: '/app/sales', label: 'Point of Sale' },
  { to: '/app/prescriptions', label: 'Prescriptions' },
  { to: '/app/prescriptions/approval', label: 'Approval Queue', adminOnly: true },
  { to: '/app/reports', label: 'Reports & Analytics' },
  { to: '/app/admin/audit-log', label: 'Audit Log', adminOnly: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();
  const items = navItems.filter((i) => !i.adminOnly || isAdmin);
  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'sidebar-overlay-visible' : ''}`}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <nav>
          {items.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              onClick={onClose}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
