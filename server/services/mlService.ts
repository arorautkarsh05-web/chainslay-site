import { pool } from "../config/database";
import type { MLPredictionResult } from "../../shared/types";

export interface RawSalesRecord {
  orderId?: string;
  sku: string;
  date: Date | string | number;
  quantity: number;
}

export interface SKUHistoricalData {
  sku: string;
  stockQuantity: number;
  targetStock: number;
  unitCost: number;
  leadTimeDays?: number;
  salesRecords: RawSalesRecord[];
}

export interface InventoryMLOutput {
  sku: string;
  status: "SUCCESS" | "FALLBACK" | "INSUFFICIENT_DATA" | "FAILED";
  forecasts: {
    period30d: number;
    period60d: number;
    period90d: number;
  };
  metrics: {
    averageDailyDemand: number;
    demandStdDev: number;
    safetyStock: number;
    reorderPoint: number;
    recommendedOrderQuantity: number;
    leadTimeDays: number;
    confidenceScore: number;
  };
  recommendation: {
    type: "REORDER" | "EXCESS_STOCK" | "OPTIMIZED" | "INSUFFICIENT_DATA";
    description: string;
    impactValue: number;
    confidenceScore: number;
  };
  modelName: string;
  modelVersion: string;
}

const MODEL_NAME = "BASELINE_EMA";
const MODEL_VERSION = "1.0.0";
const DEFAULT_SERVICE_LEVEL_Z = 1.65; // 95% service level
const DEFAULT_LEAD_TIME_DAYS = 7;
const MIN_DATA_POINTS_REQUIRED = 3;

/**
 * Validates and sanitizes raw sales records:
 * - Rejects negative or NaN quantities
 * - Rejects invalid dates
 * - Deduplicates identical order records (same orderId + sku + date + qty)
 */
export function validateAndCleanSalesRecords(records: RawSalesRecord[]): {
  validRecords: { date: Date; quantity: number }[];
  rejectedCount: number;
  duplicateCount: number;
} {
  const validRecords: { date: Date; quantity: number }[] = [];
  const seenSignatures = new Set<string>();
  let rejectedCount = 0;
  let duplicateCount = 0;

  for (const rec of records) {
    // 1. Quantity validation: must be finite, strictly positive
    const qty = Number(rec.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      rejectedCount++;
      continue;
    }

    // 2. Date validation: parse Excel date number, ISO string, or Date
    let parsedDate: Date;
    if (typeof rec.date === "number") {
      // Excel serial date to JS Date: (serial - 25569) * 86400 * 1000
      parsedDate = new Date(Math.round((rec.date - 25569) * 86400 * 1000));
    } else {
      parsedDate = new Date(rec.date);
    }

    if (isNaN(parsedDate.getTime())) {
      rejectedCount++;
      continue;
    }

    // 3. Deduplication check
    const dateKey = parsedDate.toISOString().slice(0, 10);
    const signature = `${rec.orderId || "NO_ID"}_${rec.sku}_${dateKey}_${qty}`;
    if (seenSignatures.has(signature)) {
      duplicateCount++;
      continue;
    }
    seenSignatures.add(signature);

    validRecords.push({ date: parsedDate, quantity: qty });
  }

  // Sort chronologically ascending
  validRecords.sort((a, b) => a.date.getTime() - b.date.getTime());

  return { validRecords, rejectedCount, duplicateCount };
}

/**
 * Calculates baseline inventory statistics and forecasts for a single SKU.
 */
export function calculateSKUPredictions(
  item: SKUHistoricalData
): InventoryMLOutput {
  // Validate lead time
  let leadTime = Number(item.leadTimeDays);
  if (!Number.isFinite(leadTime) || leadTime <= 0) {
    leadTime = DEFAULT_LEAD_TIME_DAYS;
  }

  const { validRecords } = validateAndCleanSalesRecords(
    item.salesRecords || []
  );

  // Handle Insufficient Data Fallback
  if (validRecords.length < MIN_DATA_POINTS_REQUIRED) {
    const fallbackDemandDaily = Math.max(0.1, (item.stockQuantity * 0.7) / 30);
    const fallbackROP = Math.max(1, Math.round(fallbackDemandDaily * leadTime));
    const isExcess =
      item.stockQuantity > item.targetStock && item.targetStock > 0;
    const excessQty = isExcess ? item.stockQuantity - item.targetStock : 0;

    return {
      sku: item.sku,
      status: "INSUFFICIENT_DATA",
      forecasts: {
        period30d: Math.round(fallbackDemandDaily * 30),
        period60d: Math.round(fallbackDemandDaily * 60),
        period90d: Math.round(fallbackDemandDaily * 90),
      },
      metrics: {
        averageDailyDemand: Number(fallbackDemandDaily.toFixed(2)),
        demandStdDev: 0,
        safetyStock: 0,
        reorderPoint: fallbackROP,
        recommendedOrderQuantity:
          item.stockQuantity <= fallbackROP
            ? Math.max(0, item.targetStock - item.stockQuantity)
            : 0,
        leadTimeDays: leadTime,
        confidenceScore: 0.0,
      },
      recommendation: {
        type: isExcess ? "EXCESS_STOCK" : "INSUFFICIENT_DATA",
        description: isExcess
          ? `Excess stock detected (${excessQty} units above target). Fallback heuristic applied due to sparse sales history.`
          : "Insufficient historical sales data for statistical ML forecasting. Operational heuristic active.",
        impactValue: Number((excessQty * item.unitCost).toFixed(2)),
        confidenceScore: 0.0,
      },
      modelName: MODEL_NAME,
      modelVersion: MODEL_VERSION,
    };
  }

  // Aggregate daily quantities
  const dailyMap = new Map<string, number>();
  for (const r of validRecords) {
    const key = r.date.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) || 0) + r.quantity);
  }

  const dailyDemands = Array.from(dailyMap.values());
  const totalDemand = dailyDemands.reduce((acc, v) => acc + v, 0);

  // Time span in days
  const startDate = validRecords[0].date;
  const endDate = validRecords[validRecords.length - 1].date;
  const timeSpanDays = Math.max(
    1,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  // Average Daily Demand (ADD)
  const averageDailyDemand = totalDemand / timeSpanDays;

  // Demand Standard Deviation (sample std dev)
  let demandStdDev = 0;
  if (dailyDemands.length > 1) {
    const variance =
      dailyDemands.reduce(
        (acc, val) => acc + Math.pow(val - averageDailyDemand, 2),
        0
      ) /
      (dailyDemands.length - 1);
    demandStdDev = Math.sqrt(variance);
  }

  // Safety Stock = Z * sigma * sqrt(L)
  const safetyStock = Math.round(
    DEFAULT_SERVICE_LEVEL_Z * demandStdDev * Math.sqrt(leadTime)
  );

  // Reorder Point = (ADD * L) + Safety Stock
  const reorderPoint = Math.round(averageDailyDemand * leadTime + safetyStock);

  // Exponential Moving Average calculation for daily forecast rate
  let emaDaily = dailyDemands[0];
  const alpha = 2 / (dailyDemands.length + 1);
  for (let i = 1; i < dailyDemands.length; i++) {
    emaDaily = alpha * dailyDemands[i] + (1 - alpha) * emaDaily;
  }
  // Blend with daily average to stabilize short series
  const forecastDailyRate = Math.max(
    0.1,
    Number(((emaDaily + averageDailyDemand) / 2).toFixed(2))
  );

  const period30d = Math.round(forecastDailyRate * 30);
  const period60d = Math.round(forecastDailyRate * 60);
  const period90d = Math.round(forecastDailyRate * 90);

  // Statistical confidence score based on coefficient of variation and history length
  const cv = averageDailyDemand > 0 ? demandStdDev / averageDailyDemand : 1.0;
  let confidence =
    1.0 - Math.min(0.5, cv * 0.3) + Math.min(0.2, dailyDemands.length / 50);
  confidence = Math.max(0.1, Math.min(0.99, Number(confidence.toFixed(2))));

  // Recommended Order Quantity
  let recommendedQuantity = 0;
  if (item.stockQuantity <= reorderPoint) {
    recommendedQuantity = Math.max(
      0,
      (item.targetStock || reorderPoint) - item.stockQuantity + period30d
    );
  }

  // Recommendation classification
  let recType: "REORDER" | "EXCESS_STOCK" | "OPTIMIZED" | "INSUFFICIENT_DATA" =
    "OPTIMIZED";
  let description =
    "Stock level healthy within safety stock and reorder boundaries.";
  let impactValue = 0;

  if (item.stockQuantity > item.targetStock && item.targetStock > 0) {
    recType = "EXCESS_STOCK";
    const excessQty = item.stockQuantity - item.targetStock;
    impactValue = Number((excessQty * item.unitCost).toFixed(2));
    description = `Excess inventory detected: ${excessQty} units above target holding. Working capital tied up.`;
  } else if (item.stockQuantity <= reorderPoint) {
    recType = "REORDER";
    impactValue = Number((recommendedQuantity * item.unitCost).toFixed(2));
    description = `Stock level (${item.stockQuantity} units) at or below ROP (${reorderPoint}). Recommended reorder: ${recommendedQuantity} units.`;
  }

  return {
    sku: item.sku,
    status: "SUCCESS",
    forecasts: {
      period30d,
      period60d,
      period90d,
    },
    metrics: {
      averageDailyDemand: Number(averageDailyDemand.toFixed(2)),
      demandStdDev: Number(demandStdDev.toFixed(2)),
      safetyStock,
      reorderPoint,
      recommendedOrderQuantity: recommendedQuantity,
      leadTimeDays: leadTime,
      confidenceScore: confidence,
    },
    recommendation: {
      type: recType,
      description,
      impactValue,
      confidenceScore: confidence,
    },
    modelName: MODEL_NAME,
    modelVersion: MODEL_VERSION,
  };
}

/**
 * Persists ML forecasts and recommendations to the database safely.
 * Reuses existing `forecasts` and `recommendations` tables with additive fields.
 */
export async function persistMLPredictions(
  workspaceId: number,
  inventoryItemId: number,
  predictions: InventoryMLOutput
): Promise<{ forecastIds: number[]; recommendationId: number | null }> {
  const forecastIds: number[] = [];
  let recommendationId: number | null = null;

  try {
    // 1. Persist 30, 60, and 90 day forecasts
    const horizons = [
      { period: "30_DAYS", value: predictions.forecasts.period30d },
      { period: "60_DAYS", value: predictions.forecasts.period60d },
      { period: "90_DAYS", value: predictions.forecasts.period90d },
    ];

    for (const h of horizons) {
      const [res]: any = await pool.query(
        `INSERT INTO forecasts (
          workspace_id, inventory_item_id, forecast_period, predicted_demand, confidence_score, model_name, model_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          workspaceId,
          inventoryItemId,
          h.period,
          h.value,
          predictions.metrics.confidenceScore,
          predictions.modelName,
          predictions.modelVersion,
        ]
      );
      if (res?.insertId) forecastIds.push(res.insertId);
    }

    // 2. Persist recommendation
    const [recRes]: any = await pool.query(
      `INSERT INTO recommendations (
        workspace_id, inventory_item_id, recommendation_type, description, impact_value,
        confidence_score, status, safety_stock, reorder_point, recommended_quantity, model_version
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
      [
        workspaceId,
        inventoryItemId,
        predictions.recommendation.type,
        predictions.recommendation.description,
        predictions.recommendation.impactValue,
        predictions.recommendation.confidenceScore,
        predictions.metrics.safetyStock,
        predictions.metrics.reorderPoint,
        predictions.metrics.recommendedOrderQuantity,
        predictions.modelVersion,
      ]
    );

    if (recRes?.insertId) {
      recommendationId = recRes.insertId;
    }
  } catch (err: any) {
    console.error(
      "[ML_SERVICE] Error persisting ML predictions to database:",
      err?.message
    );
  }

  return { forecastIds, recommendationId };
}

/**
 * Batch processor for inventory items post-upload.
 * Runs only if ENABLE_ML === 'true'.
 */
export async function processInventoryBatchWithML(
  workspaceId: number,
  items: SKUHistoricalData[],
  insertedItemMap: Map<string, number>
): Promise<{
  processedCount: number;
  successCount: number;
  insufficientDataCount: number;
  fallbackCount: number;
}> {
  if (process.env.ENABLE_ML !== "true") {
    return {
      processedCount: 0,
      successCount: 0,
      insufficientDataCount: 0,
      fallbackCount: 0,
    };
  }

  let successCount = 0;
  let insufficientDataCount = 0;
  let fallbackCount = 0;

  for (const item of items) {
    const inventoryItemId = insertedItemMap.get(item.sku);
    if (!inventoryItemId) continue;

    try {
      const pred = calculateSKUPredictions(item);
      if (pred.status === "SUCCESS") {
        successCount++;
      } else if (pred.status === "INSUFFICIENT_DATA") {
        insufficientDataCount++;
      } else {
        fallbackCount++;
      }

      // Persist to forecasts & recommendations tables
      const { recommendationId } = await persistMLPredictions(
        workspaceId,
        inventoryItemId,
        pred
      );

      // If item was placed into approval_requests, enrich with ML metadata
      if (recommendationId && pred.recommendation.type === "EXCESS_STOCK") {
        await pool
          .query(
            `UPDATE approval_requests 
           SET recommendation_id = ?, ml_confidence = ?, ml_suggested_action = ?, ml_model_version = ?
           WHERE inventory_item_id = ? AND status = 'PENDING'`,
            [
              recommendationId,
              pred.recommendation.confidenceScore,
              pred.recommendation.description,
              pred.modelVersion,
              inventoryItemId,
            ]
          )
          .catch(() => {});
      }
    } catch (err: any) {
      console.warn(
        `[ML_SERVICE] Failed prediction for SKU ${item.sku}:`,
        err?.message
      );
      fallbackCount++;
    }
  }

  return {
    processedCount: items.length,
    successCount,
    insufficientDataCount,
    fallbackCount,
  };
}
