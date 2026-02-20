import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

export default function Header({ onMenuClick, sidebarOpen }) {
  const { user, profile, logout } = useAuth();
  return (
    <header className="header">
      <button
        type="button"
        className="header-menu-btn"
        onClick={onMenuClick}
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
      <h1 className="header-title">Pharmacy Pilot</h1>
      <div className="header-user">
        {profile?.pharmacy?.name && (
          <span className="header-pharmacy" title={profile.pharmacy.address || profile.pharmacy.name}>
            {profile.pharmacy.name}
          </span>
        )}
        <span>{profile?.full_name || user?.email}</span>
        <span className="header-role">{profile?.role || 'STAFF'}</span>
        <button onClick={logout} className="btn btn-ghost">Logout</button>
      </div>
    </header>
  );
}
