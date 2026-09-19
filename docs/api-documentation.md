# Chainslay API Documentation (Phase 2 Updated)

**Base URL**: `/api`

---

## 1. Inventory Endpoints

### Get All Inventory Items

- **URL**: `/inventory`
- **Method**: `GET`
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 50)
  - `search` (string)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": 1,
          "sku": "SKU001",
          "product_name": "Electronic Motor",
          "category": "Electronics",
          "stock_quantity": 1000,
          "target_stock": 300,
          "unit_cost": "500.00",
          "inventory_value": "500000.00",
          "abc_class": "A",
          "xyz_class": "X",
          "fsn_class": "F",
          "segment": "A-X-F",
          "status": "EXCESS",
          "excess_quantity": 700,
          "excess_value": "350000.00"
        }
      ],
      "pagination": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
    }
  }
  ```

### Get Item Forecasts (Additive Endpoint)

- **URL**: `/inventory/:id/forecasts`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "inventory_item_id": 1,
        "forecast_period": "30_DAYS",
        "predicted_demand": 185,
        "confidence_score": "0.92",
        "model_name": "BASELINE_EMA",
        "model_version": "1.0.0",
        "created_at": "2026-09-18T00:00:00.000Z"
      }
    ]
  }
  ```

### Get Item Recommendations (Additive Endpoint)

- **URL**: `/inventory/:id/recommendations`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "inventory_item_id": 1,
        "recommendation_type": "EXCESS_STOCK",
        "description": "Excess inventory detected: 700 units above target holding.",
        "impact_value": "350000.00",
        "confidence_score": "0.92",
        "safety_stock": 15,
        "reorder_point": 45,
        "recommended_quantity": 0,
        "status": "PENDING",
        "model_version": "1.0.0"
      }
    ]
  }
  ```

---

## 2. Ingestion & Upload Endpoints

### Upload Inventory Dataset

- **URL**: `/uploads`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Field**: `file` (`.csv` or `.xlsx`)
- **Feature Flag Behavior**:
  - If `ENABLE_ML=false`: Computes standard 70% demand and 30% reorder heuristics.
  - If `ENABLE_ML=true`: Runs historical sales cleaning and baseline EMA demand modeling.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "uploadBatchId": 1,
      "filename": "inventory.csv",
      "totalRows": 1204,
      "validRows": 1200,
      "invalidRows": 4,
      "duplicateRows": 0,
      "missingValues": 4
    }
  }
  ```

### Upload History

- **URL**: `/uploads`
- **Method**: `GET`
- **Response**: List of recent upload batch records.

---

## 3. Manager Approval Endpoints

### Get Pending Approvals

- **URL**: `/approvals`
- **Method**: `GET`
- **Query Parameters**: `status` (default: `PENDING`)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "inventory_item_id": 1,
        "sku": "SKU001",
        "name": "Electronic Motor",
        "reason": "Reallocate excess capital: 700 units above target",
        "excess_quantity": 700,
        "excess_value": "350000.00",
        "status": "PENDING",
        "recommendation_id": 1,
        "ml_confidence": "0.92",
        "ml_suggested_action": "Excess inventory detected: 700 units above target holding.",
        "ml_model_version": "1.0.0"
      }
    ]
  }
  ```

### Approve Request

- **URL**: `/approvals/:id/approve`
- **Method**: `PUT`
- **Body**: `{ "approved_by": "Manager Name" }`
- **Response**: `{ "success": true, "message": "Request approved successfully" }`

### Reject Request

- **URL**: `/approvals/:id/reject`
- **Method**: `PUT`
- **Body**: `{ "approved_by": "Manager Name" }`
- **Response**: `{ "success": true, "message": "Request rejected successfully" }`

---

## 4. Audit & Ledger Endpoints

### Get Blockchain / Audit Logs

- **URL**: `/blockchain/logs`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "record_id": "REC891234",
        "sku": "SKU001",
        "action": "POLICY_APPROVED",
        "version": 1,
        "data_hash": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        "verified": 1,
        "verification_mode": "CRYPTOGRAPHIC_SIMULATION",
        "tx_status": "LOCAL_ONLY",
        "created_at": "2026-09-18T00:00:00.000Z"
      }
    ]
  }
  ```

---

## 5. Health Check

- **URL**: `/health`
- **Method**: `GET`
- **Response**: `{ "success": true, "message": "Server is healthy and connected to MySQL" }`
