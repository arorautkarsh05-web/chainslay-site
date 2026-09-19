# Machine Learning Architecture & Forecasting Baseline (Phase 2)

**Version**: 1.0.0  
**Status**: Implemented & Verified  
**Feature Flag**: `ENABLE_ML` (Default: `false`)

---

## 1. Architectural Overview

The Chainslay Machine Learning layer provides an evidence-based, statistical forecasting and inventory optimization baseline. It operates as an asynchronous, non-blocking extension to the operational data ingestion pipeline.

```mermaid
flowchart TD
    Ingest[Data Upload / CSV & XLSX] --> CheckFF{ENABLE_ML == 'true'?}
    CheckFF -->|false (Default)| Legacy[Operational Heuristic Pipeline<br>70% Demand & 30% Reorder]
    CheckFF -->|true| MLService[ML Prediction Engine<br>server/services/mlService.ts]
    MLService --> Clean[Data Validation & Cleaning<br>Rejects invalid dates, negative qty, deduplicates]
    Clean --> CheckCount{Valid Records >= 3?}
    CheckCount -->|No| Sparse[Status: INSUFFICIENT_DATA<br>Preserve Heuristic Fallback]
    CheckCount -->|Yes| StatEngine[Statistical Modeling<br>ADD, StdDev, EMA, Safety Stock, ROP]
    StatEngine --> Horizons[Forecast Horizons<br>30, 60, and 90 Days]
    Horizons --> RecEngine[Evidence-Based Recommendation<br>REORDER, EXCESS_STOCK, OPTIMIZED]
    RecEngine --> Persist[Persist to DB<br>forecasts & recommendations tables]
    Persist --> DB[(MySQL DB)]
    Sparse --> Persist
    Legacy --> DB
```

---

## 2. Feature Flag & Safety Guarantees

- **Variable Name**: `ENABLE_ML`
- **Default Value**: `false` in `.env` and `.env.example`
- **Resilience Guarantee**:
  - If `ENABLE_ML=false`, ML execution is bypassed.
  - If the ML service encounters a timeout (>3000ms), malformed data, or an unhandled exception, the upload workflow catches the error, logs a sanitized message without exposing credentials, and finishes with status `COMPLETED`.
  - **File uploads and database writes will never fail due to an ML issue.**

---

## 3. Data Validation & Cleaning

Before calculating statistical forecasts, `validateAndCleanSalesRecords` enforces strict hygiene rules:

1. **Quantity Sanitization**: Rejects non-finite, negative, or zero quantities ($qty \le 0$).
2. **Date Sanitization**: Parses ISO dates, UNIX timestamps, and Excel serial day numbers. Rejects invalid dates (`NaN`).
3. **Deduplication**: Detects identical records sharing the same `orderId`, `sku`, date, and quantity.
4. **Chronological Sorting**: Sorts historical events ascending by date.

---

## 4. Mathematical Modeling & Formulas

### A. Average Daily Demand ($ADD$)

$$\text{ADD} = \frac{\sum_{i=1}^{N} \text{Daily Demand}_i}{\text{Time Span in Days}}$$

### B. Demand Standard Deviation ($\sigma_d$)

Calculated as the sample standard deviation over daily sales:
$$\sigma_d = \sqrt{\frac{\sum_{i=1}^{N} (\text{Daily Demand}_i - \text{ADD})^2}{N - 1}}$$

### C. Safety Stock ($SS$)

Protects against demand fluctuations during supplier lead time:
$$\text{Safety Stock} = \text{round}\left(Z \times \sigma_d \times \sqrt{L}\right)$$

- $Z$: Service-level factor (Default: $1.65$ for 95% cycle service level)
- $L$: Lead time in days (Default: $7$ days if zero or omitted)

### D. Reorder Point ($ROP$)

Determines when a new purchase order should be placed:
$$\text{ROP} = \text{round}\left(\text{ADD} \times L + \text{Safety Stock}\right)$$

### E. Exponential Moving Average (EMA) Demand Forecast

Calculated across daily sales sequence with smoothing factor $\alpha = \frac{2}{N+1}$:
$$\text{EMA}_t = \alpha \times D_t + (1 - \alpha) \times \text{EMA}_{t-1}$$
Daily forecast rate is blended with historical average:
$$\text{Daily Rate} = \frac{\text{EMA} + \text{ADD}}{2}$$

- **30-Day Forecast**: $\text{round}(\text{Daily Rate} \times 30)$
- **60-Day Forecast**: $\text{round}(\text{Daily Rate} \times 60)$
- **90-Day Forecast**: $\text{round}(\text{Daily Rate} \times 90)$

### F. Statistical Confidence Score

Evaluates demand stability based on the coefficient of variation ($CV = \sigma_d / \text{ADD}$) and sample size ($N$):
$$\text{Confidence} = \max\left(0.10, \min\left(0.99, 1.0 - \min(0.5, CV \times 0.3) + \min(0.2, N / 50)\right)\right)$$

---

## 5. Evidence-Based Recommendation Rules

| Recommendation Type | Condition                                                   | Description                                                                                                                                     |
| ------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `REORDER`           | $\text{Current Stock} \le \text{ROP}$                       | Stock at or below reorder threshold. Recommended order quantity: $\max(0, \text{Target Stock} - \text{Current Stock} + \text{Forecast}_{30d})$. |
| `EXCESS_STOCK`      | $\text{Current Stock} > \text{Target Stock} > 0$            | Excess capital holding. Quantifies excess units and financial value tied up.                                                                    |
| `OPTIMIZED`         | $\text{ROP} < \text{Current Stock} \le \text{Target Stock}$ | Stock level within safe operating boundaries.                                                                                                   |
| `INSUFFICIENT_DATA` | Valid historical data points $< 3$                          | Sparse data. Operational heuristic fallback preserved.                                                                                          |

---

## 6. Database Storage & Schema Mapping

The ML service persists predictions into the existing database tables:

### A. `forecasts` Table

- `workspace_id`: Grouping identifier (default `1`)
- `inventory_item_id`: Reference to `inventory_items.id`
- `forecast_period`: `'30_DAYS'`, `'60_DAYS'`, or `'90_DAYS'`
- `predicted_demand`: Projected quantity (int)
- `confidence_score`: Statistical score (decimal 5,2)
- `model_name`: `'BASELINE_EMA'`
- `model_version`: `'1.0.0'`

### B. `recommendations` Table

- `inventory_item_id`: Reference to `inventory_items.id`
- `recommendation_type`: `'REORDER'`, `'EXCESS_STOCK'`, `'OPTIMIZED'`, or `'INSUFFICIENT_DATA'`
- `description`: Audit explanation text
- `impact_value`: Monetary impact in currency (decimal 15,2)
- `safety_stock`: Calculated safety stock units (int)
- `reorder_point`: Calculated ROP (int)
- `recommended_quantity`: Recommended purchase units (int)
- `confidence_score`: Statistical score (decimal 5,2)
- `status`: `'PENDING'`

---

## 7. Example Output Payload

```json
{
  "sku": "SKU-ELEC-401",
  "status": "SUCCESS",
  "forecasts": {
    "period30d": 185,
    "period60d": 370,
    "period90d": 555
  },
  "metrics": {
    "averageDailyDemand": 6.17,
    "demandStdDev": 1.45,
    "safetyStock": 6,
    "reorderPoint": 49,
    "recommendedOrderQuantity": 150,
    "leadTimeDays": 7,
    "confidenceScore": 0.92
  },
  "recommendation": {
    "type": "REORDER",
    "description": "Stock level (40 units) at or below ROP (49). Recommended reorder: 150 units.",
    "impactValue": 75000.0,
    "confidenceScore": 0.92
  },
  "modelName": "BASELINE_EMA",
  "modelVersion": "1.0.0"
}
```

---

## 8. Test Execution Commands

```bash
# Run unit and integration tests for ML Service
npx vitest run --root . test/ml-service.test.ts

# Run all test suites
npx vitest run --root . test/
```
