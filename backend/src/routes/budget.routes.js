import { Router } from 'express';
import { getBudgets, setBudget, getBudgetAlerts } from '../controllers/budget.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', getBudgets);
router.post('/', setBudget);
router.get('/alerts', getBudgetAlerts);

export default router;
