import { Router } from 'express';
import { getCoachAdvice, getGamificationStats } from '../controllers/coach.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/gamification', getGamificationStats);
router.post('/chat', getCoachAdvice);

export default router;
