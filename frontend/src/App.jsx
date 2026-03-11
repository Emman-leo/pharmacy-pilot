import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import ResetPassword from './components/auth/ResetPassword';
import SubscriptionExpired from './components/auth/SubscriptionExpired';
import LandingPage from './components/landing/LandingPage';
import Spinner from './components/common/Spinner';
import PaymentSuccess from './components/payments/PaymentSuccess';
import Dashboard from './components/Dashboard';
import InventoryPage from './components/inventory/InventoryPage';
import DrugList from './components/inventory/DrugList';
import BatchForm from './components/inventory/BatchForm';
import StockAlerts from './components/inventory/StockAlerts';
import PointOfSale from './components/sales/PointOfSale';
import SalesHistory from './components/sales/SalesHistory';
import ReceiptViewer from './components/sales/ReceiptViewer';
import PrescriptionForm from './components/prescriptions/PrescriptionForm';
import ApprovalQueue from './components/prescriptions/ApprovalQueue';
import ReportsPage from './components/reports/ReportsPage';
import AuditLogPage from './components/admin/AuditLogPage';
import ExpensesPage from './components/accounting/ExpensesPage';
import DailyClosePage from './components/accounting/DailyClosePage';
import PLPage from './components/accounting/PLPage';
import SettingsPage from './components/settings/SettingsPage';
import SuperAdminRoute from './components/superadmin/SuperAdminRoute';
import SuperAdminLayout from './components/superadmin/SuperAdminLayout';
import PlatformStats from './components/superadmin/PlatformStats';
import PharmaciesList from './components/superadmin/PharmaciesList';
import CreatePharmacyForm from './components/superadmin/CreatePharmacyForm';
import PharmacyDetail from './components/superadmin/PharmacyDetail';
import AllUsersList from './components/superadmin/AllUsersList';

function ProtectedRoute({ children, adminOnly }) {
  const { isAuthenticated, loading, isAdmin, profile } = useAuth();
  if (loading) return <Spinner label="Loading session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/app" replace />;
  // Redirect super-admins away from pharmacy routes (except if already on super-admin routes)
  if (!profile?.pharmacy_id && window.location.pathname !== '/super-admin' && !window.location.pathname.startsWith('/super-admin/')) {
    return <Navigate to="/super-admin" replace />;
  }
  return children;
}

function LandingOrRedirect() {
  const { isAuthenticated, loading, profile } = useAuth();
  if (loading) return <Spinner label="Loading…" />;
  if (isAuthenticated) {
    // Super admins (no pharmacy) go to admin panel, others go to app
    if (!profile?.pharmacy_id) {
      return <Navigate to="/super-admin" replace />;
    }
    return <Navigate to="/app" replace />;
  }
  return <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingOrRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/expired" element={<SubscriptionExpired />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/drugs" element={<DrugList />} />
        <Route path="inventory/batches" element={<Navigate to="/app/inventory" replace />} />
        <Route path="inventory/alerts" element={<StockAlerts />} />
        <Route path="sales" element={<PointOfSale />} />
        <Route path="sales/history" element={<SalesHistory />} />
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
        <Route
          path="settings"
          element={
            <ProtectedRoute adminOnly>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="accounting/expenses" element={<ExpensesPage />} />
        <Route
          path="accounting/daily-close"
          element={
            <ProtectedRoute adminOnly>
              <DailyClosePage />
            </ProtectedRoute>
          }
        />
        <Route path="accounting/pl" element={<PLPage />} />
      </Route>
      
      <Route
        path="/super-admin"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<PlatformStats />} />
        <Route path="pharmacies" element={<PharmaciesList />} />
        <Route path="pharmacies/new" element={<CreatePharmacyForm />} />
        <Route path="pharmacies/:id" element={<PharmacyDetail />} />
        <Route path="users" element={<AllUsersList />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
