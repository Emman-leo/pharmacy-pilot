import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/app/inventory', label: 'Inventory', icon: '📦', end: true },
  { to: '/app/inventory/drugs', label: 'Drugs', icon: '💊', end: true },
  { to: '/app/inventory/alerts', label: 'Alerts', icon: '⚠️', end: true },
  { to: '/app/sales', label: 'Point of Sale', icon: '🧾', end: true },
  { to: '/app/prescriptions', label: 'Prescriptions', icon: '📋', end: true },
  { to: '/app/prescriptions/approval', label: 'Approval Queue', icon: '✅', adminOnly: true, end: true },
  { to: '/app/reports', label: 'Reports & Analytics', icon: '📊', end: true },
  { to: '/app/admin/audit-log', label: 'Audit Log', icon: '🔍', adminOnly: true, end: true },
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
          {items.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              onClick={onClose}
            >
              <span className="sidebar-icon" aria-hidden>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
