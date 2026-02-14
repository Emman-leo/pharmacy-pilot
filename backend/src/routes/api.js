import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import * as authController from '../controllers/authController.js';
import * as inventoryController from '../controllers/inventoryController.js';
import * as salesController from '../controllers/salesController.js';
import * as prescriptionController from '../controllers/prescriptionController.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();

// Auth (uses Supabase client directly; proxy endpoints for convenience)
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/user', authMiddleware, authController.getUser);
router.post('/auth/logout', authController.logout);

// Inventory (auth required; ADMIN for create/update drugs)
router.get('/inventory/drugs', authMiddleware, inventoryController.getDrugs);
router.post('/inventory/drugs', authMiddleware, requireRole('ADMIN'), inventoryController.createDrug);
router.put('/inventory/drugs/:id', authMiddleware, requireRole('ADMIN'), inventoryController.updateDrug);
router.get('/inventory/batches', authMiddleware, inventoryController.getBatches);
router.post('/inventory/batches', authMiddleware, inventoryController.addBatch);
router.put('/inventory/batches/:id', authMiddleware, inventoryController.updateBatch);
router.get('/inventory/alerts', authMiddleware, inventoryController.getAlerts);

// Sales
router.post('/sales/estimate', authMiddleware, salesController.estimate);
router.post('/sales/checkout', authMiddleware, salesController.checkout);
router.get('/sales/history', authMiddleware, salesController.getHistory);
router.get('/sales/receipt/:id', authMiddleware, salesController.getReceipt);

// Prescriptions
router.post('/prescriptions', authMiddleware, prescriptionController.create);
router.get('/prescriptions', authMiddleware, prescriptionController.list);
router.get('/prescriptions/pending', authMiddleware, requireRole('ADMIN'), prescriptionController.getPending);
router.put('/prescriptions/:id/approve', authMiddleware, requireRole('ADMIN'), prescriptionController.approve);
router.put('/prescriptions/:id/reject', authMiddleware, requireRole('ADMIN'), prescriptionController.reject);

// Reports
router.get('/reports/sales-summary', authMiddleware, reportController.salesSummary);
router.get('/reports/top-selling', authMiddleware, reportController.topSelling);
router.get('/reports/expiry-alerts', authMiddleware, reportController.expiryAlerts);

export default router;
