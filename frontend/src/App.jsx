import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Dashboard from './components/Dashboard';
import InventoryPage from './components/inventory/InventoryPage';
import DrugList from './components/inventory/DrugList';
import BatchForm from './components/inventory/BatchForm';
import StockAlerts from './components/inventory/StockAlerts';
import PointOfSale from './components/sales/PointOfSale';
import ReceiptViewer from './components/sales/ReceiptViewer';
import PrescriptionForm from './components/prescriptions/PrescriptionForm';
import ApprovalQueue from './components/prescriptions/ApprovalQueue';
import ReportsPage from './components/reports/ReportsPage';
import AuditLogPage from './components/admin/AuditLogPage';

function ProtectedRoute({ children, adminOnly }) {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/drugs" element={<DrugList />} />
        <Route path="inventory/batches" element={<Navigate to="/inventory" replace />} />
        <Route path="inventory/alerts" element={<StockAlerts />} />
        <Route path="sales" element={<PointOfSale />} />
        <Route path="sales/receipt/:id" element={<ReceiptViewer />} />
        <Route path="prescriptions" element={<PrescriptionForm />} />
        <Route
          path="prescriptions/approval"
          element={
            <ProtectedRoute adminOnly>
              <ApprovalQueue />
            </ProtectedRoute>
          }
        />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="admin/audit-log"
          element={
            <ProtectedRoute adminOnly>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
