import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';

export default function SuperAdminLayout() {
  const { profile } = useAuth();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-content">
          <h1 className="header-title">Pharmacy Pilot — Admin</h1>
          <div className="header-user">
            <span className="user-email">{profile?.email}</span>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <div className="main-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
