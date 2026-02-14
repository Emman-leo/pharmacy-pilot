import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

export default function Header() {
  const { user, profile, logout } = useAuth();
  return (
    <header className="header">
      <h1 className="header-title">Pharmacy Pilot</h1>
      <div className="header-user">
        <span>{profile?.full_name || user?.email}</span>
        <span className="header-role">{profile?.role || 'STAFF'}</span>
        <button onClick={logout} className="btn btn-ghost">Logout</button>
      </div>
    </header>
  );
}
