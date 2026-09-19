import express from 'express';
import { getApprovals, createApproval, approveRequest, rejectRequest } from '../controllers/approvalController';

const router = express.Router();

router.get('/', getApprovals);
router.post('/', createApproval);
router.put('/:id/approve', approveRequest);
router.put('/:id/reject', rejectRequest);

export default router;
