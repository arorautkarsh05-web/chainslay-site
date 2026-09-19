import express from "express";
import {
  getCalendar,
  getRecommendations,
  getSummary,
  createReorderApproval,
} from "../controllers/festivalController";

const router = express.Router();

router.get("/calendar", getCalendar);
router.get("/recommendations", getRecommendations);
router.get("/summary", getSummary);
router.post("/reorder-approval", createReorderApproval);

export default router;
