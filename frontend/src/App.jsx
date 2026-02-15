import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Dashboard from './components/Dashboard';
import DrugList from './components/inventory/DrugList';
import BatchForm from './components/inventory/BatchForm';
import StockAlerts from './components/inventory/StockAlerts';
import PointOfSale from './components/sales/PointOfSale';
import ReceiptViewer from './components/sales/ReceiptViewer';
import PrescriptionForm from './components/prescriptions/PrescriptionForm';
import ApprovalQueue from './components/prescriptions/ApprovalQueue';
import SalesReport from './components/reports/SalesReport';
import ExpiryReport from './components/reports/ExpiryReport';
import ProfitReport from './components/reports/ProfitReport';
import SalesByPeriodReport from './components/reports/SalesByPeriodReport';
import InventoryValuationReport from './components/reports/InventoryValuationReport';
import SlowMovingReport from './components/reports/SlowMovingReport';

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
        <Route path="inventory/drugs" element={<DrugList />} />
        <Route path="inventory/batches" element={<BatchForm />} />
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
        <Route path="reports/sales" element={<SalesReport />} />
        <Route path="reports/expiry" element={<ExpiryReport />} />
        <Route path="reports/profit" element={<ProfitReport />} />
        <Route path="reports/sales-by-period" element={<SalesByPeriodReport />} />
        <Route path="reports/valuation" element={<InventoryValuationReport />} />
        <Route path="reports/slow-moving" element={<SlowMovingReport />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
