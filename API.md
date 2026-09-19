# Chainslay API Documentation

## Base URL
`/api`

---

## Inventory API

### Get Inventory
- **URL**: `/inventory`
- **Method**: `GET`
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 20)
  - `search` (string)
  - `status` (string)
  - `category` (string)
  - `segment` (string)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "items": [...],
      "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
    }
  }
  ```

### Get Inventory Item by ID
- **URL**: `/inventory/:id`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": 1, "sku": "SKU001", ... }
  }
  ```

---

## Upload API

### Upload File
- **URL**: `/uploads`
- **Method**: `POST`
- **Body**: `multipart/form-data` with `file` field.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "uploadId": 1,
      "filename": "inventory.csv",
      "totalRows": 1200,
      "validRows": 1195,
      "invalidRows": 5,
      "duplicates": 0,
      "missingValues": 5
    }
  }
  ```

### Get Upload History
- **URL**: `/uploads`
- **Method**: `GET`
- **Response**: Array of upload records.

---

## Dashboard API

### Get Dashboard Summary
- **URL**: `/dashboard/summary`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "totalInventoryValue": 4500000,
      "totalSkus": 1204,
      "excessValue": 500000,
      "excessPercentage": 11,
      "itemsNeedingReview": 5,
      "optimizedItems": 1000,
      "understockedItems": 50
    }
  }
  ```

### Get Recent Alerts
- **URL**: `/dashboard/alerts`
- **Method**: `GET`
- **Response**: Array of inventory items that are EXCESS or UNDERSTOCK.

---

## Analytics API

### Get Segmentation Stats
- **URL**: `/analytics/segmentation`
- **Method**: `GET`
- **Response**: Array of objects with `abc_class`, `count`, `value`, `percentage`.

---

## Approval API

### Get Pending Approvals
- **URL**: `/approvals`
- **Method**: `GET`
- **Query Params**: `status` (default: PENDING)
- **Response**: Array of approval requests.

### Approve Request
- **URL**: `/approvals/:id/approve`
- **Method**: `PUT`
- **Response**: `{ "success": true, "message": "Request approved successfully" }`

### Reject Request
- **URL**: `/approvals/:id/reject`
- **Method**: `PUT`
- **Response**: `{ "success": true, "message": "Request rejected successfully" }`

---

## Blockchain API

### Get Logs
- **URL**: `/blockchain/logs`
- **Method**: `GET`
- **Response**: Array of blockchain log records.
