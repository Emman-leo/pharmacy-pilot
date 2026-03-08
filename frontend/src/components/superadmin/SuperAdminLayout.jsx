import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './SuperAdminLayout.css';

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="layout">
      <header className="header">
        <button
          type="button"
          className="header-menu-btn"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={!!sidebarOpen}
        >
          <span className="header-menu-icon" aria-hidden>
            {sidebarOpen ? (
              <>&#10005;</>
            ) : (
              <>
                <span className="menu-bar" />
                <span className="menu-bar" />
                <span className="menu-bar" />
              </>
            )}
          </span>
        </button>
        <h1 className="header-title">Pharmacy Pilot — Admin</h1>
        <div className="header-user">
          <span>{profile?.full_name || profile?.email}</span>
          <span className="header-role">Super Admin</span>
          <button onClick={handleLogout} className="btn btn-ghost">Logout</button>
        </div>
      </header>
      
      <div className="layout-body">
        <div className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay-visible' : ''}`}
             onClick={() => setSidebarOpen(false)}
             onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
             aria-hidden="true" />
        
        <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <NavLink
            to="/super-admin"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sidebar-icon" aria-hidden>📊</span>
            <span>Overview</span>
          </NavLink>
          <NavLink
            to="/super-admin/pharmacies"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sidebar-icon" aria-hidden>🏥</span>
            <span>Pharmacies</span>
          </NavLink>
          <NavLink
            to="/super-admin/users"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sidebar-icon" aria-hidden>👥</span>
            <span>All Users</span>
          </NavLink>
        </nav>
        
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
