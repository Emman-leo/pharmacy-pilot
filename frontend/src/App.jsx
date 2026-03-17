import { Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
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
import SuppliersPage from './components/inventory/SuppliersPage';
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
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import OnboardingWizard from './components/onboarding/OnboardingWizard';

function ProtectedRoute({ children, adminOnly }) {
  const { isAuthenticated, loading, isAdmin, profile, isSuperAdmin } = useAuth();
  if (loading) return <Spinner label="Loading session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/app" replace />;

  const path = window.location.pathname;

  // Super admins go to super-admin panel
  if (isSuperAdmin && !path.startsWith('/super-admin') && path !== '/onboarding') {
    return <Navigate to="/super-admin" replace />;
  }

  // Regular users with no pharmacy go to onboarding
  if (!isSuperAdmin && !profile?.pharmacy_id && path !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

// New protected route that redirects to onboarding if no pharmacy:
function AppRoute({ children }) {
  const { isAuthenticated, loading, profile, isSuperAdmin } = useAuth();
  if (loading) return <Spinner label="Loading…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (!profile?.pharmacy_id) return <Navigate to="/onboarding" replace />;
  return children;
}

function LandingOrRedirect() {
  const { isAuthenticated, loading, profile, isSuperAdmin } = useAuth();
  if (loading) return <Spinner label="Loading…" />;
  if (isAuthenticated) {
    if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
    if (!profile?.pharmacy_id) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/app" replace />;
  }
  return <LandingPage />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingOrRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login defaultMode="register" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/expired" element={<SubscriptionExpired />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        } />
        <Route
          path="/app"
          element={<AppRoute><Layout /></AppRoute>}
        >
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/suppliers" element={<SuppliersPage />} />
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
      <SpeedInsights />
      <Analytics />
    </>
  );
}
