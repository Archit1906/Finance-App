import { Router } from 'express';
import { getLoans, addLoan, deleteLoan } from '../controllers/loan.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', getLoans);
router.post('/', addLoan);
router.delete('/:id', deleteLoan);

export default router;
