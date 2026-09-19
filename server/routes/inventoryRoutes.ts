import express from "express";
import {
  getInventory,
  getInventoryById,
  getInventoryBySku,
  createInventory,
  updateInventory,
  deleteInventory,
  getItemForecasts,
  getItemRecommendations,
} from "../controllers/inventoryController";

const router = express.Router();

router.get("/", getInventory);
router.get("/:id", getInventoryById);
router.get("/sku/:sku", getInventoryBySku);
router.get("/:id/forecasts", getItemForecasts);
router.get("/:id/recommendations", getItemRecommendations);
router.post("/", createInventory);
router.put("/:id", updateInventory);
router.delete("/:id", deleteInventory);

export default router;
