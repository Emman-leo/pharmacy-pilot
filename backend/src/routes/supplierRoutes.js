import { Router } from 'express';
import { getSuppliers, addSupplier } from '../controllers/supplierController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getSuppliers);
router.post('/', addSupplier);

export default router;
