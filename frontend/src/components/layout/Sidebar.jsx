import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/app/inventory', label: 'Inventory', icon: '📦', end: true },
  { to: '/app/inventory/drugs', label: 'Drugs', icon: '💊', nested: true, end: true, group: 'INVENTORY' },
  { to: '/app/inventory/alerts', label: 'Alerts', icon: '⚠️', nested: true, end: true, group: 'INVENTORY' },
  { to: '/app/sales', label: 'Point of Sale', icon: '🧾', end: true },
  { to: '/app/sales/history', label: 'Sales History', icon: '🧾', end: true },
  { to: '/app/prescriptions', label: 'Prescriptions', icon: '📋', end: true },
  { to: '/app/prescriptions/approval', label: 'Approval Queue', icon: '✅', adminOnly: true, end: true },
  { to: '/app/reports', label: 'Reports & Analytics', icon: '📊', end: true },
  { to: '/app/admin/audit-log', label: 'Audit Log', icon: '🔍', adminOnly: true, end: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();
  const items = navItems.filter((i) => !i.adminOnly || isAdmin);
  
  const renderNavItems = () => {
    const elements = [];
    let lastGroup = null;
    
    items.forEach(({ to, label, icon, end, nested, group }) => {
      // Add group label if this item has a group and it's different from the last one
      if (group && group !== lastGroup) {
        elements.push(
          <div key={`group-${group}`} className="sidebar-group-label">
            {group}
          </div>
        );
        lastGroup = group;
      }
      
      elements.push(
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => {
            const base = nested ? 'sidebar-link sidebar-link-nested' : 'sidebar-link';
            return isActive ? `${base} active` : base;
          }}
          onClick={onClose}
        >
          <span className="sidebar-icon" aria-hidden>{icon}</span>
          <span>{label}</span>
        </NavLink>
      );
    });
    
    return elements;
  };

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
          {renderNavItems()}
        </nav>
      </aside>
    </>
  );
}
