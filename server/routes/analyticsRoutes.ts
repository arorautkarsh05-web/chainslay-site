import express from 'express';
import { getSegmentationStats, getInventorySummary } from '../controllers/analyticsController';

const router = express.Router();

router.get('/segmentation', getSegmentationStats);
router.get('/summary', getInventorySummary);
router.get('/inventory', (req, res) => {
  // Can reuse inventoryController for this or redirect
  res.redirect('/api/inventory' + req.url);
});

export default router;
