import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { tierMiddleware, requireFeature } from '../middleware/tierMiddleware.js';
import { validate } from '../middleware/validate.js';
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
import * as onboardingController from '../controllers/onboardingController.js';
import supplierRoutes from './supplierRoutes.js';

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
router.post(
  '/auth/login',
  authLimiter,
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 1, max: 200 }).withMessage('Password is required'),
  validate,
  authController.login,
);
router.post(
  '/auth/register',
  authLimiter,
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 8, max: 200 }).withMessage('Password must be at least 8 characters'),
  body('full_name').optional().isString().isLength({ max: 120 }).withMessage('full_name must be a string'),
  validate,
  authController.register,
);
router.get('/auth/user', authMiddleware, tierMiddleware, authController.getUser);
router.get('/auth/users', authMiddleware, tierMiddleware, requireRole('ADMIN'), authController.listUsers);
router.post('/auth/users', authMiddleware, tierMiddleware, requireRole('ADMIN'), authController.addStaff);
router.put('/auth/users/:id/role', authMiddleware, tierMiddleware, requireRole('ADMIN'), authController.updateUserRole);
router.put('/auth/users/:id/status', authMiddleware, tierMiddleware, requireRole('ADMIN'), authController.updateUserStatus);
router.post('/auth/logout', authController.logout);
router.post(
  '/auth/forgot-password',
  authLimiter,
  body('email').isEmail().withMessage('Valid email is required'),
  validate,
  authController.forgotPassword,
);

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
router.get('/inventory/tally', authMiddleware, inventoryController.getStockTally);

// Sales
router.post('/sales/estimate', authMiddleware, salesController.estimate);
router.post(
  '/sales/checkout',
  authMiddleware,
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.drug_id').isUUID().withMessage('items[].drug_id must be a UUID'),
  body('items.*.quantity').isInt({ min: 1, max: 9999 }).withMessage('items[].quantity must be an integer between 1 and 9999'),
  body('discount_amount').optional().isFloat({ min: 0 }).withMessage('discount_amount must be a non-negative number'),
  body('payment_method').isIn(['cash', 'momo', 'card']).withMessage('payment_method must be one of: cash, momo, card'),
  body('customer_name').optional().isString().isLength({ max: 120 }).withMessage('customer_name must be a string'),
  validate,
  salesController.checkout,
);
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
router.post(
  '/payments/initialize',
  authMiddleware,
  tierMiddleware,
  body('months')
    .optional()
    .custom((v) => [1, 3, 6, 12].includes(Number(v)))
    .withMessage('months must be one of: 1, 3, 6, 12'),
  validate,
  initializePayment,
);
router.get(
  '/payments/verify/:reference',
  param('reference').isString().isLength({ min: 6, max: 120 }).withMessage('reference is required'),
  validate,
  verifyPayment,
);

// Onboarding — authenticated but no tier/subscription check
router.post(
  '/onboarding/complete',
  authLimiter,
  authMiddleware,
  body('pharmacy_name').isString().isLength({ min: 2, max: 160 }).withMessage('pharmacy_name is required'),
  body('tier').optional().isIn(['starter', 'growth', 'pro']).withMessage('tier must be starter, growth, or pro'),
  body('phone').optional().isString().isLength({ max: 60 }).withMessage('phone must be a string'),
  body('address').optional().isString().isLength({ max: 240 }).withMessage('address must be a string'),
  validate,
  onboardingController.completeOnboarding,
);

// Suppliers
router.use('/suppliers', supplierRoutes);

export default router;
