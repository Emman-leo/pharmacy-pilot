import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';

function SuperAdminRoute({ children }) {
  const { isAuthenticated, loading, isSuperAdmin } = useAuth();
  
  if (loading) return <Spinner label="Loading..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/app" replace />;
  
  return children;
}

export default SuperAdminRoute;
