import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTier } from '../../hooks/useTier';
import './Sidebar.css';

// Pharmacy navigation (existing behavior)
function PharmacyNav({ onClose, isAdmin, can }) {
  const navItems = [
    { to: '/app',                  label: 'Dashboard',          icon: '🏠', end: true },
    { to: '/app/inventory',        label: 'Inventory',           icon: '📦', end: true },
    { to: '/app/inventory/drugs',  label: 'Drugs',               icon: '💊', nested: true, end: true },
    { to: '/app/inventory/alerts', label: 'Alerts',              icon: '⚠️', nested: true, end: true },
    { to: '/app/inventory/suppliers', label: 'Suppliers', icon: '🏭', nested: true, end: true },
    { to: '/app/sales',            label: 'Point of Sale',       icon: '🧾', end: true },
    { to: '/app/sales/history',    label: 'Sales History',       icon: '📋', end: true },
    { to: '/app/reports',          label: 'Reports & Analytics', icon: '📊', end: true },
    { to: '/app/accounting/expenses',    label: 'Expenses',     icon: '💸', nested: true, end: true, group: 'ACCOUNTING', feature: 'accounting' },
    { to: '/app/accounting/daily-close', label: 'Daily Close',  icon: '🔒', nested: true, end: true, group: 'ACCOUNTING', feature: 'accounting', adminOnly: true },
    { to: '/app/accounting/pl',          label: 'P&L',          icon: '📈', nested: true, end: true, group: 'ACCOUNTING', feature: 'accounting' },
    { to: '/app/admin/audit-log',  label: 'Audit Log',           icon: '🔍', adminOnly: true, feature: 'auditLog', end: true },
    { to: '/app/settings',        label: 'Settings',            icon: '⚙️', adminOnly: true, end: true },
  ];

  const items = navItems.filter((i) => {
    if (i.adminOnly && !isAdmin) return false;
    if (i.feature && !can(i.feature)) return false;
    return true;
  });
  
  const renderNavItems = () => {
    const elements = [];
    let lastGroup = null;
    
    items.forEach(({ to, label, icon, end, nested }) => {
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

  return <>{renderNavItems()}</>;
}

// Super admin navigation
function SuperAdminNav({ onClose }) {
  const navItems = [
    { to: '/super-admin',         label: 'Overview',    icon: '📊', end: true },
    { to: '/super-admin/pharmacies', label: 'Pharmacies',  icon: '🏥', end: true },
    { to: '/super-admin/users',      label: 'All Users',   icon: '👥', end: true },
  ];

  return (
    <>
      {navItems.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="sidebar-icon" aria-hidden>{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { profile, isAdmin } = useAuth();
  const { can } = useTier();
  
  const isSuperAdmin = !profile?.pharmacy_id;

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
          {isSuperAdmin
            ? <SuperAdminNav onClose={onClose} />
            : <PharmacyNav onClose={onClose} isAdmin={isAdmin} can={can} />
          }
        </nav>
      </aside>
    </>
  );
}
