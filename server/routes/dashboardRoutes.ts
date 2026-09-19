import express from 'express';
import { getDashboardSummary, getRecentAlerts } from '../controllers/dashboardController';

const router = express.Router();

router.get('/summary', getDashboardSummary);
router.get('/alerts', getRecentAlerts);

export default router;
