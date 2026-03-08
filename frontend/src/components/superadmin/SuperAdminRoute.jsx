import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';

function SuperAdminRoute({ children }) {
  const { profile, loading } = useAuth();
  
  if (loading) return <Spinner label="Loading..." />;
  
  // Super admin = authenticated + no pharmacy assigned
  if (!profile || profile.pharmacy_id) {
    return <Navigate to="/app" replace />;
  }
  
  return children;
}

export default SuperAdminRoute;
