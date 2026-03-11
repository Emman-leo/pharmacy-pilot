import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { tierMiddleware, requireFeature } from '../middleware/tierMiddleware.js';
import * as authController from '../controllers/authController.js';
import * as inventoryController from '../controllers/inventoryController.js';
import * as salesController from '../controllers/salesController.js';
import * as prescriptionController from '../controllers/prescriptionController.js';
import * as reportController from '../controllers/reportController.js';
import * as auditController from '../controllers/auditController.js';
import * as pharmacyController from '../controllers/pharmacyController.js';
import * as contactController from '../controllers/contactController.js';
import * as accountingController from '../controllers/accountingController.js';
import * as superAdminController from '../controllers/superAdminController.js';
import { requireSuperAdmin } from '../middleware/superAdminMiddleware.js';
import { initializePayment, verifyPayment } from '../controllers/paymentsController.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth (uses Supabase client directly; proxy endpoints for convenience)
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/register', authLimiter, authController.register);
router.get('/auth/user', authMiddleware, tierMiddleware, authController.getUser);
router.get('/auth/users', authMiddleware, tierMiddleware, requireRole('ADMIN'), authController.listUsers);
router.post('/auth/users', authMiddleware, tierMiddleware, requireRole('ADMIN'), authController.addStaff);
router.put('/auth/users/:id/role', authMiddleware, tierMiddleware, requireRole('ADMIN'), authController.updateUserRole);
router.put('/auth/users/:id/status', authMiddleware, tierMiddleware, requireRole('ADMIN'), authController.updateUserStatus);
router.post('/auth/logout', authController.logout);
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword);

// Pharmacies (list and current pharmacy settings)
router.get('/pharmacies', authMiddleware, pharmacyController.listPharmacies);
router.get('/pharmacies/my-settings', authMiddleware, pharmacyController.getMyPharmacySettings);
router.get('/pharmacies/staff-count', authMiddleware, tierMiddleware, pharmacyController.getStaffCount);

// Inventory (auth required; ADMIN for create/update drugs)
router.get('/inventory/drugs', authMiddleware, inventoryController.getDrugs);
router.post('/inventory/drugs', authMiddleware, tierMiddleware, requireRole('ADMIN'), inventoryController.createDrug);
router.put('/inventory/drugs/:id', authMiddleware, tierMiddleware, requireRole('ADMIN'), inventoryController.updateDrug);
router.get('/inventory/active-stock', authMiddleware, inventoryController.getActiveStock);
router.get('/inventory/batches', authMiddleware, inventoryController.getBatches);
router.post('/inventory/batches', authMiddleware, tierMiddleware, requireRole('ADMIN'), inventoryController.addBatch);
router.put('/inventory/batches/:id', authMiddleware, tierMiddleware, requireRole('ADMIN'), inventoryController.updateBatch);
router.get('/inventory/alerts', authMiddleware, inventoryController.getAlerts);

// Sales
router.post('/sales/estimate', authMiddleware, salesController.estimate);
router.post('/sales/checkout', authMiddleware, salesController.checkout);
router.get('/sales/history', authMiddleware, salesController.getHistory);
router.get('/sales/receipt/:id', authMiddleware, salesController.getReceipt);
router.post('/sales/:id/void', authMiddleware, tierMiddleware, requireRole('ADMIN'), salesController.voidSale);

// Public contact form
router.post('/contact', contactLimiter, contactController.submitContact);

// Prescriptions
router.post('/prescriptions', authMiddleware, prescriptionController.create);
router.get('/prescriptions', authMiddleware, prescriptionController.list);
router.get('/prescriptions/pending', authMiddleware, tierMiddleware, requireRole('ADMIN'), prescriptionController.getPending);
router.put('/prescriptions/:id/approve', authMiddleware, tierMiddleware, requireRole('ADMIN'), prescriptionController.approve);
router.put('/prescriptions/:id/reject', authMiddleware, tierMiddleware, requireRole('ADMIN'), prescriptionController.reject);

// Reports
router.get('/reports/overview', authMiddleware, reportController.overview);
router.get('/reports/category-distribution', authMiddleware, reportController.categoryDistribution);
router.get('/reports/sales-summary', authMiddleware, reportController.salesSummary);
router.get('/reports/top-selling', authMiddleware, reportController.topSelling);
router.get('/reports/expiry-alerts', authMiddleware, reportController.expiryAlerts);
router.get('/reports/profit-margin', authMiddleware, reportController.profitMargin);
router.get('/reports/sales-by-period', authMiddleware, reportController.salesByPeriod);
router.get('/reports/inventory-valuation', authMiddleware, reportController.inventoryValuation);
router.get('/reports/slow-moving', authMiddleware, reportController.slowMoving);

// Admin tools
router.get(
  '/admin/audit-logs',
  authMiddleware,
  tierMiddleware,
  requireRole('ADMIN'),
  requireFeature('auditLog'),
  auditController.listAuditLogs,
);

// Accounting (Pro tier only)
router.post('/accounting/expenses',              authMiddleware, tierMiddleware, requireFeature('accounting'), accountingController.createExpense);
router.get('/accounting/expenses',               authMiddleware, tierMiddleware, requireFeature('accounting'), accountingController.listExpenses);
router.delete('/accounting/expenses/:id',        authMiddleware, tierMiddleware, requireFeature('accounting'), requireRole('ADMIN'), accountingController.deleteExpense);
router.get('/accounting/daily-close/preview',    authMiddleware, tierMiddleware, requireFeature('accounting'), accountingController.getDailyClosePreview);
router.post('/accounting/daily-close',           authMiddleware, tierMiddleware, requireFeature('accounting'), requireRole('ADMIN'), accountingController.submitDailyClose);
router.get('/accounting/daily-close/history',    authMiddleware, tierMiddleware, requireFeature('accounting'), accountingController.getDailyCloseHistory);
router.get('/accounting/pl',                     authMiddleware, tierMiddleware, requireFeature('accounting'), accountingController.getProfitAndLoss);

// Super-admin panel — no pharmacy users only
router.get('/admin/stats',                    authMiddleware, tierMiddleware, requireSuperAdmin, superAdminController.getStats);
router.get('/admin/pharmacies',               authMiddleware, tierMiddleware, requireSuperAdmin, superAdminController.listPharmacies);
router.get('/admin/pharmacies/:id',           authMiddleware, tierMiddleware, requireSuperAdmin, superAdminController.getPharmacy);
router.post('/admin/pharmacies',              authMiddleware, tierMiddleware, requireSuperAdmin, superAdminController.createPharmacy);
router.put('/admin/pharmacies/:id',           authMiddleware, tierMiddleware, requireSuperAdmin, superAdminController.updatePharmacy);
router.get('/admin/pharmacies/:id/users',     authMiddleware, tierMiddleware, requireSuperAdmin, superAdminController.listPharmacyUsers);
router.post('/admin/pharmacies/:id/users',    authMiddleware, tierMiddleware, requireSuperAdmin, superAdminController.createPharmacyUser);
router.get('/admin/users',                    authMiddleware, tierMiddleware, requireSuperAdmin, superAdminController.listAllUsers);

// Authenticated payment routes
router.post('/payments/initialize', authMiddleware, tierMiddleware, initializePayment);
router.get('/payments/verify/:reference', verifyPayment);

export default router;
