import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import * as authController from '../controllers/authController.js';
import * as inventoryController from '../controllers/inventoryController.js';
import * as salesController from '../controllers/salesController.js';
import * as prescriptionController from '../controllers/prescriptionController.js';
import * as reportController from '../controllers/reportController.js';
import * as auditController from '../controllers/auditController.js';
import * as pharmacyController from '../controllers/pharmacyController.js';
import * as contactController from '../controllers/contactController.js';

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
router.get('/auth/user', authMiddleware, authController.getUser);
router.post('/auth/logout', authController.logout);
router.post('/auth/forgot-password', authLimiter, authController.forgotPassword);

// Pharmacies (list and current pharmacy settings)
router.get('/pharmacies', authMiddleware, pharmacyController.listPharmacies);
router.get('/pharmacies/my-settings', authMiddleware, pharmacyController.getMyPharmacySettings);

// Inventory (auth required; ADMIN for create/update drugs)
router.get('/inventory/drugs', authMiddleware, inventoryController.getDrugs);
router.post('/inventory/drugs', authMiddleware, requireRole('ADMIN'), inventoryController.createDrug);
router.put('/inventory/drugs/:id', authMiddleware, requireRole('ADMIN'), inventoryController.updateDrug);
router.get('/inventory/active-stock', authMiddleware, inventoryController.getActiveStock);
router.get('/inventory/batches', authMiddleware, inventoryController.getBatches);
router.post('/inventory/batches', authMiddleware, inventoryController.addBatch);
router.put('/inventory/batches/:id', authMiddleware, inventoryController.updateBatch);
router.get('/inventory/alerts', authMiddleware, inventoryController.getAlerts);

// Sales
router.post('/sales/estimate', authMiddleware, salesController.estimate);
router.post('/sales/checkout', authMiddleware, salesController.checkout);
router.get('/sales/history', authMiddleware, salesController.getHistory);
router.get('/sales/receipt/:id', authMiddleware, salesController.getReceipt);
router.post('/sales/:id/void', authMiddleware, requireRole('ADMIN'), salesController.voidSale);

// Public contact form
router.post('/contact', contactLimiter, contactController.submitContact);

// Prescriptions
router.post('/prescriptions', authMiddleware, prescriptionController.create);
router.get('/prescriptions', authMiddleware, prescriptionController.list);
router.get('/prescriptions/pending', authMiddleware, requireRole('ADMIN'), prescriptionController.getPending);
router.put('/prescriptions/:id/approve', authMiddleware, requireRole('ADMIN'), prescriptionController.approve);
router.put('/prescriptions/:id/reject', authMiddleware, requireRole('ADMIN'), prescriptionController.reject);

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
  requireRole('ADMIN'),
  auditController.listAuditLogs,
);

export default router;
