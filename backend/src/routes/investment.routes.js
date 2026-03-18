import { Router } from 'express';
import { getInvestments, addInvestment, refreshPrices } from '../controllers/investment.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', getInvestments);
router.post('/', addInvestment);
router.post('/refresh-prices', refreshPrices);

export default router;
