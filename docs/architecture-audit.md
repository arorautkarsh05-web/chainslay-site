# Chainslay Architecture Audit & Implementation Plan (Corrected Baseline)

**Date**: September 2026  
**Status**: Corrected Pre-Implementation Audit (Phase 1 Baseline)  
**Target Environment**: Node.js + Express (TypeScript) / React 19 + Vite (TypeScript) / MySQL 8.x

---

## 1. Executive Summary & Verification Findings

This updated audit incorporates direct inspection of the live MySQL database (`chainslay_db`) and `database/schema.sql`. It establishes the verified table names, data types, safe additive migration plans, and boundaries for **Phase 1: Foundation & Safe Migration**.

### Critical Audit Clarifications:

1. **Audit / Ledger Table**: Both `blockchain_logs` and `ledger_events` exist in MySQL:
   - `blockchain_logs` is the **active audit table** wired to `approvalController.ts` and `blockchainController.ts`.
   - `ledger_events` is an unused schema artifact.
   - **Decision**: All audit additions will be applied additively to `blockchain_logs`. `ledger_events` will remain untouched.
2. **Approval Workflow Table**: Both `approvals` and `approval_requests` exist in MySQL:
   - `approval_requests` is the **active operational table** used by `uploadController.ts` and `approvalController.ts`.
   - `approvals` is queried for pending count in `dashboardController.ts`.
   - **Decision**: All operational enhancements and ML linkages will be applied additively to `approval_requests`. `approvals` will remain untouched.

---

## 2. Schema Compatibility Report (Live Database Verification)

The following schema was verified directly against the live database via `information_schema`:

| Table Name          | Verified Columns & Data Types                                                                                                                                                                                                                                                        | Primary Key / Index                                                          | Code Usage                                  | Planned Additions                                                                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forecasts`         | `id` (int)<br>`workspace_id` (int)<br>`inventory_item_id` (int)<br>`forecast_period` (varchar 50)<br>`predicted_demand` (int)<br>`confidence_score` (decimal 5,2)<br>`created_at` (timestamp)                                                                                        | PK: `id`<br>FK: `workspace_id`<br>FK: `inventory_item_id`                    | Currently empty                             | Add nullable columns:<br>• `model_name VARCHAR(100) NULL`<br>• `model_version VARCHAR(50) NULL`                                                                                                                                                                                                      |
| `recommendations`   | `id` (int)<br>`workspace_id` (int)<br>`inventory_item_id` (int)<br>`recommendation_type` (varchar 100)<br>`description` (text)<br>`impact_value` (decimal 15,2)<br>`confidence_score` (decimal 5,2)<br>`status` (varchar 30)<br>`created_at` (timestamp)<br>`updated_at` (timestamp) | PK: `id`<br>FK: `workspace_id`<br>FK: `inventory_item_id`<br>INDEX: `status` | Currently empty                             | Add nullable columns:<br>• `safety_stock INT NULL`<br>• `reorder_point INT NULL`<br>• `recommended_quantity INT NULL`<br>• `model_version VARCHAR(50) NULL`                                                                                                                                          |
| `approval_requests` | `id` (int)<br>`inventory_item_id` (int)<br>`sku` (varchar 100)<br>`reason` (text)<br>`excess_quantity` (int)<br>`excess_value` (decimal 15,2)<br>`status` (varchar 30)<br>`approved_by` (varchar 150)<br>`approved_at` (timestamp)<br>`created_at` (timestamp)                       | PK: `id`<br>FK: `inventory_item_id`                                          | **Active** (Upload, Approval controllers)   | Add nullable columns:<br>• `recommendation_id INT NULL` (matches `recommendations.id` int)<br>• `ml_confidence DECIMAL(5,2) NULL`<br>• `ml_suggested_action VARCHAR(255) NULL`<br>• `ml_model_version VARCHAR(50) NULL`                                                                              |
| `blockchain_logs`   | `id` (int)<br>`record_id` (varchar 100)<br>`sku` (varchar 100)<br>`action` (varchar 100)<br>`version` (int)<br>`data_hash` (varchar 255)<br>`verified` (tinyint 1)<br>`created_at` (timestamp)                                                                                       | PK: `id`                                                                     | **Active** (Approval logging & UI timeline) | Add nullable columns:<br>• `tx_hash VARCHAR(255) NULL`<br>• `block_number BIGINT NULL`<br>• `network_id VARCHAR(50) DEFAULT 'LOCAL_SIMULATION'`<br>• `verification_mode VARCHAR(50) DEFAULT 'CRYPTOGRAPHIC_SIMULATION'`<br>• `tx_status VARCHAR(30) DEFAULT 'LOCAL_ONLY'`<br>• `error_log TEXT NULL` |
| `approvals`         | `id` (int), `workspace_id` (int), `recommendation_id` (int), `inventory_item_id` (int), `action_type` (varchar 100), `status` (varchar 30), `approved_by` (int), `approved_at` (timestamp), `created_at` (timestamp)                                                                 | PK: `id`                                                                     | Legacy / Dashboard count                    | **Untouched**                                                                                                                                                                                                                                                                                        |
| `ledger_events`     | `id` (int), `workspace_id` (int), `record_type` (varchar 50), `record_id` (int), `action` (varchar 100), `data_hash` (varchar 255), `verified` (tinyint 1), `created_by` (int), `created_at` (timestamp)                                                                             | PK: `id`                                                                     | Unused                                      | **Untouched**                                                                                                                                                                                                                                                                                        |

### Foreign-Key-Like Field Compatibility:

- `approval_requests.recommendation_id` (`INT NULL`) aligns perfectly with `recommendations.id` (`INT AUTO_INCREMENT`).
- `recommendations.inventory_item_id` (`INT NOT NULL`) aligns with `inventory_items.id` (`INT AUTO_INCREMENT`).
- `forecasts.inventory_item_id` (`INT NOT NULL`) aligns with `inventory_items.id` (`INT AUTO_INCREMENT`).

---

## 3. Database Safety, Migration & Compatibility Test Plan

Instead of asserting "0% impact", we implement a formal, controlled database safety lifecycle:

### Migration Safety Rules:

1. **No Destructive SQL**: Absolutely zero `DROP`, `TRUNCATE`, `DELETE`, or table `RENAME` statements.
2. **Strictly Idempotent**: Uses `SELECT COUNT(*) FROM information_schema.COLUMNS` prior to executing any `ALTER TABLE ADD COLUMN`. If the column already exists, execution continues cleanly without error.
3. **Strictly Nullable**: Every added column is `NULL` or carries a safe default, ensuring existing queries, inserts, and operational transactions never fail.
4. **Pre-Migration Schema Check**: Migration script validates MySQL version, target database connection, and existing table presence before running alterations.
5. **Post-Migration Compatibility Test**: Migration runs a verification suite that performs:
   - Schema column verification
   - Read test across all modified tables
   - Backward-compatible insert/update test on `approval_requests` and `blockchain_logs`
   - Rollback instructions verification.

### Migration Script Location:

- `scripts/migrations/002_add_ml_blockchain_fields.js`

### Rollback & Recovery Instructions:

If recovery is ever needed, the nullable columns can be safely ignored without altering existing application behavior. If a schema reversion is required, run:

```sql
ALTER TABLE approval_requests DROP COLUMN recommendation_id, DROP COLUMN ml_confidence, DROP COLUMN ml_suggested_action, DROP COLUMN ml_model_version;
ALTER TABLE blockchain_logs DROP COLUMN tx_hash, DROP COLUMN block_number, DROP COLUMN network_id, DROP COLUMN verification_mode, DROP COLUMN tx_status, DROP COLUMN error_log;
ALTER TABLE forecasts DROP COLUMN model_name, DROP COLUMN model_version;
ALTER TABLE recommendations DROP COLUMN safety_stock, DROP COLUMN reorder_point, DROP COLUMN recommended_quantity, DROP COLUMN model_version;
```

---

## 4. Machine Learning (ML) Phase 1 Scope

### Principle: Reliable Baseline Only (No Hallucinations, No Fake Numbers)

- **Default State**: `ENABLE_ML=false` in environment config.
- **Fallback Behavior**: When disabled or in case of error/missing data, the current heuristic (70% demand, 30% reorder) remains 100% active and untouched.
- **Phase 1 Baseline Algorithms**:
  1. **Moving Average (SMA) / Exponential Moving Average (EMA)**:
     - Calculated over historical stock snapshot / demand points if available.
     - If history < 3 points: Assign status `INSUFFICIENT_DATA` and fall back to operational baseline.
  2. **Safety Stock Formula**:
     $$\text{Safety Stock} = Z \times \sigma_L \times \sqrt{L}$$
     _(Baseline: $Z = 1.65$ for 95% service level, lead time $L$ with standard demand deviation)._
  3. **Reorder Point (ROP) Formula**:
     $$\text{ROP} = (\text{Lead Time} \times \text{Average Daily Demand}) + \text{Safety Stock}$$
  4. **Recommended Quantity**:
     $$\text{Recommended Quantity} = \max(0, \text{Target Stock} - \text{Current Stock} + \text{Predicted Demand})$$
  5. **Confidence Score**:
     - Calculated mathematically based on coefficient of variation ($CV = \sigma / \mu$). High volatility yields lower confidence; stable velocity yields higher confidence.
  6. **Model Tracking**:
     - `model_name: "BASELINE_EMA"`
     - `model_version: "1.0.0"`

---

## 5. Blockchain Integration & Fallback Plan

### Principle: Absolute Honesty in Ledger Status

1. **Terminology**:
   - `CRYPTOGRAPHIC_SIMULATION`: Local SHA-256 hash stored in MySQL. Never labeled as "on-chain" or "decentralized".
   - `ON_CHAIN`: Real EVM transaction confirmed on a public or local RPC node with verified `tx_hash` and `block_number`.
2. **Default State**:
   - `BLOCKCHAIN_ENABLED=false` (Default: local SHA-256 cryptographic simulation).
3. **Resilient Fallback Policy**:
   - If real blockchain RPC is enabled but encounters:
     - Network timeout
     - Insufficient gas
     - Missing or invalid private key
     - Contract revert
   - **Guarantees**:
     - Manager's approval/rejection **MUST STILL SUCCEED** in the operational database.
     - Local SHA-256 audit record is saved in `blockchain_logs` with:
       - `verification_mode = 'CRYPTOGRAPHIC_SIMULATION'`
       - `tx_status = 'LOCAL_ONLY'` (or `'PENDING'`)
       - `error_log = sanitizedError` (no private keys or secrets logged).
     - Duplicate submissions are prevented via idempotent record ID locking.
4. **Smart Contract Specification (Phase 2 Preparation)**:
   - Contract name: `ChainslayAuditLedger.sol`
   - **Access Control**: OpenZeppelin `AccessControl` / `Ownable` (Admin role + authorized Manager role).
   - **Replay Protection**: Duplicate `recordId` checks reject re-submissions of already recorded decisions.
   - **Events**: `DecisionCommitted(string indexed recordId, bytes32 indexed dataHash, string sku, string action, address indexed manager, uint256 timestamp)`.
   - **Verification**: `verifyDecision(string recordId, bytes32 dataHash)` returns verification boolean and on-chain timestamp.
   - **Emergency Controls**: OpenZeppelin `Pausable` (allows contract pause/unpause by Admin).
   - **Zero PII/Inventory Data**: Only stores `recordId`, `sku`, `action`, `dataHash`, and manager address. No pricing or volume details on-chain.

---

## 6. Implementation Phasing

- **Phase 1 (Current Scope)**:
  - Additive, idempotent database migration (`scripts/migrations/002_add_ml_blockchain_fields.js`).
  - Pre- and post-migration compatibility testing script.
  - TypeScript types and interfaces definition in `shared/types.ts`.
  - Zero changes to existing database credentials or connection pool.
  - Verification: Existing tests, type check (`tsc --noEmit`), build, and migration validation.
- **Phase 2 (Subsequent Scope - Pending Approval)**:
  - ML Baseline Service implementation (`server/services/mlService.ts`) with feature flag.
  - Blockchain Dual-Engine Service (`server/services/blockchainService.ts`) with feature flag.
  - Smart Contract development (`contracts/ChainslayAuditLedger.sol`).
  - UI updates for explicit simulation vs on-chain distinction and ML recommendation cards.
