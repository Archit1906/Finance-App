import { Router } from 'express';
import { getTaxBreakdown, addTaxInvestment } from '../controllers/tax.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', getTaxBreakdown);
router.post('/', addTaxInvestment);

export default router;
