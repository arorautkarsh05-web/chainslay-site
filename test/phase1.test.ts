import { describe, it, expect } from "vitest";
import type {
  InventoryItem,
  ApprovalRequest,
  BlockchainLog,
  Forecast,
  Recommendation,
  MLPredictionResult,
} from "../shared/types";

describe("Phase 1 Foundation & Schema Types Compatibility", () => {
  it("should validate ApprovalRequest backward compatibility with optional ML fields", () => {
    const legacyApproval: ApprovalRequest = {
      id: 1,
      inventory_item_id: 10,
      sku: "SKU-001",
      reason: "Excess stock",
      excess_quantity: 50,
      excess_value: 25000,
      status: "PENDING",
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
    };
    expect(legacyApproval.sku).toBe("SKU-001");
    expect(legacyApproval.ml_confidence).toBeUndefined();

    const mlEnrichedApproval: ApprovalRequest = {
      ...legacyApproval,
      recommendation_id: 5,
      ml_confidence: 0.95,
      ml_suggested_action: "Liquidate 20 units",
      ml_model_version: "BASELINE_EMA_1.0.0",
    };
    expect(mlEnrichedApproval.ml_confidence).toBe(0.95);
  });

  it("should validate BlockchainLog backward compatibility with simulation and on-chain fields", () => {
    const simulationLog: BlockchainLog = {
      id: 1,
      record_id: "REC123456",
      sku: "SKU-001",
      action: "POLICY_APPROVED",
      version: 1,
      data_hash: "0xabcdef123456",
      verified: true,
      created_at: new Date().toISOString(),
      verification_mode: "CRYPTOGRAPHIC_SIMULATION",
      tx_status: "LOCAL_ONLY",
    };
    expect(simulationLog.verification_mode).toBe("CRYPTOGRAPHIC_SIMULATION");
    expect(simulationLog.tx_hash).toBeUndefined();

    const onChainLog: BlockchainLog = {
      ...simulationLog,
      verification_mode: "ON_CHAIN",
      tx_status: "ON_CHAIN",
      tx_hash: "0x9876543210abcdef1234567890abcdef",
      block_number: 1234567,
      network_id: "POLYGON_AMOY",
    };
    expect(onChainLog.verification_mode).toBe("ON_CHAIN");
    expect(onChainLog.block_number).toBe(1234567);
  });

  it("should validate Forecast and Recommendation models", () => {
    const forecast: Forecast = {
      id: 1,
      workspace_id: 1,
      inventory_item_id: 10,
      forecast_period: "Q4_2026",
      predicted_demand: 120,
      confidence_score: 0.88,
      created_at: new Date().toISOString(),
      model_name: "BASELINE_EMA",
      model_version: "1.0.0",
    };
    expect(forecast.predicted_demand).toBe(120);

    const recommendation: Recommendation = {
      id: 1,
      workspace_id: 1,
      inventory_item_id: 10,
      recommendation_type: "REORDER",
      description: "Reorder 50 units based on EMA",
      impact_value: 15000,
      confidence_score: 0.9,
      status: "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      safety_stock: 25,
      reorder_point: 60,
      recommended_quantity: 50,
      model_version: "1.0.0",
    };
    expect(recommendation.safety_stock).toBe(25);
  });
});
