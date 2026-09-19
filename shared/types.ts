/**
 * Shared Type Definitions for Chainslay
 * Ensures strict typing across Client, Server, ML, and Blockchain services.
 */

export type ABCClass = "A" | "B" | "C";
export type XYZClass = "X" | "Y" | "Z";
export type FSNClass = "F" | "S" | "N";
export type InventoryStatus = "OPTIMIZED" | "EXCESS" | "UNDERSTOCK";
export type RecordStatus = "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";

export interface InventoryItem {
  id: number;
  workspace_id: number;
  upload_batch_id: number | null;
  sku: string;
  product_name: string;
  category: string | null;
  location: string | null;
  supplier_name: string | null;
  abc_class: ABCClass | null;
  xyz_class: XYZClass | null;
  fsn_class: FSNClass | null;
  segment: string;
  status: InventoryStatus;
  target_stock: number;
  stock_quantity: number;
  unit_cost: number;
  inventory_value: number;
  demand_quantity: number;
  reorder_level: number;
  target_coverage_months: number;
  excess_quantity: number;
  excess_value: number;
  last_sold_at: string | null;
  record_status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface UploadBatch {
  id: number;
  workspace_id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  missing_value_rows: number;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  uploaded_by: number | null;
  created_at: string;
}

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalRequest {
  id: number;
  inventory_item_id: number;
  sku: string;
  reason: string;
  excess_quantity: number;
  excess_value: number;
  status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  // Additive ML Fields (Phase 1 Baseline)
  recommendation_id?: number | null;
  ml_confidence?: number | null;
  ml_suggested_action?: string | null;
  ml_model_version?: string | null;
}

export type VerificationMode = "CRYPTOGRAPHIC_SIMULATION" | "ON_CHAIN";
export type LedgerTxStatus = "LOCAL_ONLY" | "PENDING" | "ON_CHAIN" | "FAILED";

export interface BlockchainLog {
  id: number;
  record_id: string;
  sku: string;
  action: string;
  version: number;
  data_hash: string;
  verified: boolean;
  created_at: string;
  // Additive On-Chain Verification Fields
  tx_hash?: string | null;
  block_number?: number | null;
  network_id?: string;
  verification_mode?: VerificationMode;
  tx_status?: LedgerTxStatus;
  error_log?: string | null;
}

export interface Forecast {
  id: number;
  workspace_id: number;
  inventory_item_id: number;
  forecast_period: string;
  predicted_demand: number;
  confidence_score: number;
  created_at: string;
  // Additive model tracking
  model_name?: string | null;
  model_version?: string | null;
}

export interface Recommendation {
  id: number;
  workspace_id: number;
  inventory_item_id: number;
  recommendation_type: string;
  description: string;
  impact_value: number;
  confidence_score: number;
  status: "PENDING" | "APPLIED" | "DISMISSED";
  created_at: string;
  updated_at: string;
  // Additive prescriptive fields
  safety_stock?: number | null;
  reorder_point?: number | null;
  recommended_quantity?: number | null;
  model_version?: string | null;
}

export interface MLPredictionResult {
  predictedDemand: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedQuantity: number;
  confidenceScore: number;
  modelName: string;
  modelVersion: string;
  status: "OPTIMAL" | "INSUFFICIENT_DATA";
}
