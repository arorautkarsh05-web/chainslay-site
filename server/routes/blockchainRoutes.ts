import express from 'express';
import { getBlockchainLogs } from '../controllers/blockchainController';

const router = express.Router();

router.get('/logs', getBlockchainLogs);

export default router;
