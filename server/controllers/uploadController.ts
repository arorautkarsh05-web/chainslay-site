import { Request, Response } from "express";
import { pool } from "../config/database";
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import * as xlsxModule from "xlsx";
import {
  processInventoryBatchWithML,
  RawSalesRecord,
} from "../services/mlService";
const xlsx: any = (xlsxModule as any).default || xlsxModule;

const DEFAULT_WORKSPACE_ID = 1;

interface AggregatedItem {
  sku: string;
  productName: string;
  category: string;
  location: string | null;
  supplierName: string | null;
  stockQuantity: number;
  sales: number;
  unitCost: number;
  demandQuantity: number;
  reorderLevel: number;
  targetStock: number;
  abcClass?: string;
  xyzClass?: string;
  fsnClass?: string;
  segment?: string;
  status?: string;
}

function parseNumericValue(val: any, defaultVal = 0): number {
  if (val === undefined || val === null || val === "") return defaultVal;
  if (typeof val === "number") return Number.isFinite(val) ? val : defaultVal;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : defaultVal;
}

export function validateInventoryDataset(firstRow: any): {
  isValid: boolean;
  productSignals: string[];
  stockSignals: string[];
  detectedColumns: string[];
  reason?: string;
} {
  if (!firstRow || typeof firstRow !== "object") {
    return {
      isValid: false,
      productSignals: [],
      stockSignals: [],
      detectedColumns: [],
      reason: "The file does not contain a valid tabular header row.",
    };
  }

  const originalKeys = Object.keys(firstRow);
  if (originalKeys.length === 0) {
    return {
      isValid: false,
      productSignals: [],
      stockSignals: [],
      detectedColumns: [],
      reason: "No column headers detected in the file.",
    };
  }

  const cleanKeys = originalKeys.map((k) =>
    k.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  // Group 1: Explicit Product / SKU Identifiers
  const PRODUCT_SIGNALS = [
    "sku", "skucode", "skuid", "itemcode", "itemid", "productid", 
    "productcode", "partnumber", "partno", "productname", "product", 
    "itemname", "itemdescription", "itemdesc", "productdesc", "producttitle", 
    "barcode", "upc", "ean", "asin", "modelnumber", "model"
  ];

  // Group 2: Stock, Quantity, Inventory & Logistics
  const STOCK_SIGNALS = [
    "stockquantity", "stock", "quantity", "qty", "unitsinstock", 
    "inventoryquantity", "reorderlevel", "reorderpoint", "reorderquantity", 
    "minstock", "safetystock", "targetstock", "maxstock", "demandquantity", 
    "demand", "salesvolume", "salesquantity", "monthlydemand", "orderquantity",
    "warehouselocation", "warehouse", "suppliername", "supplier", 
    "vendorname", "vendor", "supplierid", "inventoryturnoverrate", 
    "turnoverrate", "leadtime", "abcclass", "xyzclass", "fsnclass",
    "onhand", "availableqty", "unitsinwarehouse"
  ];

  // Group 3: Cost, Price & Financials
  const PRICE_SIGNALS = [
    "unitcost", "cost", "priceperunit", "unitprice", "price", "mrp", 
    "costprice", "retailprice", "sellingprice", "inventoryvalue", 
    "totalsales", "revenue"
  ];

  // Group 4: Category / Department
  const CATEGORY_SIGNALS = [
    "category", "catagory", "productcategory", "department", "subcategory", "brand"
  ];

  const matchedProduct = originalKeys.filter((_, idx) => {
    const k = cleanKeys[idx];
    return PRODUCT_SIGNALS.some((sig) => k === sig || k.startsWith(sig) || k.endsWith(sig));
  });

  const matchedStock = originalKeys.filter((_, idx) => {
    const k = cleanKeys[idx];
    return STOCK_SIGNALS.some((sig) => k === sig || k.startsWith(sig) || k.endsWith(sig));
  });

  const matchedPrice = originalKeys.filter((_, idx) => {
    const k = cleanKeys[idx];
    return PRICE_SIGNALS.some((sig) => k === sig || k.startsWith(sig) || k.endsWith(sig));
  });

  const matchedCategory = originalKeys.filter((_, idx) => {
    const k = cleanKeys[idx];
    return CATEGORY_SIGNALS.some((sig) => k === sig || k.startsWith(sig) || k.endsWith(sig));
  });

  // Flexible Fallback: If cleanKeys has "item", "name", "title" AND there is at least one stock or price metric
  const hasGenericItemOrName = originalKeys.filter((_, idx) => {
    const k = cleanKeys[idx];
    return k === "item" || k === "name" || k === "title" || k === "description";
  });

  const hasAnyStockOrPrice = matchedStock.length > 0 || matchedPrice.length > 0;

  let effectiveProduct = [...matchedProduct];
  if (effectiveProduct.length === 0 && hasGenericItemOrName.length > 0 && hasAnyStockOrPrice) {
    effectiveProduct = hasGenericItemOrName;
  }

  const hasProduct = effectiveProduct.length > 0;
  const hasSupplyOrPrice = matchedStock.length > 0 || matchedPrice.length > 0 || matchedCategory.length > 0;

  if (!hasProduct && !hasSupplyOrPrice) {
    return {
      isValid: false,
      productSignals: [],
      stockSignals: [],
      detectedColumns: originalKeys,
      reason: "No inventory or product attributes detected. This file appears to be an unrelated document or dataset (e.g. personal contacts, student list, or general text).",
    };
  }

  if (!hasProduct) {
    return {
      isValid: false,
      productSignals: [],
      stockSignals: [...matchedStock, ...matchedPrice],
      detectedColumns: originalKeys,
      reason: "Missing product identifier column (such as 'SKU', 'Product Name', 'Item ID', or 'Part Number').",
    };
  }

  if (!hasSupplyOrPrice) {
    return {
      isValid: false,
      productSignals: effectiveProduct,
      stockSignals: [],
      detectedColumns: originalKeys,
      reason: "Missing inventory metrics (such as 'Stock Quantity', 'Unit Price', 'Reorder Level', or 'Category').",
    };
  }

  return {
    isValid: true,
    productSignals: effectiveProduct,
    stockSignals: [...matchedStock, ...matchedPrice, ...matchedCategory],
    detectedColumns: originalKeys,
  };
}

export const uploadData = async (req: Request, res: Response) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const { filename, originalname, size, mimetype, path: filePath } = req.file;
  const ext = path.extname(originalname).toLowerCase();
  const safeFileType = (
    mimetype ||
    ext ||
    "application/octet-stream"
  ).substring(0, 255);
  const safeOriginalName = (originalname || "upload" + ext).substring(0, 255);
  const safeFilename = (filename || "upload").substring(0, 255);

  let uploadBatchId: number | null = null;

  try {
    let rows: any[] = [];

    if (ext === ".csv") {
      rows = await new Promise((resolve, reject) => {
        const results: any[] = [];
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on("data", data => results.push(data))
          .on("end", () => resolve(results))
          .on("error", error => reject(error));
      });
    } else if (ext === ".xlsx" || ext === ".xls") {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.Sheets["Orders"]
        ? "Orders"
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = xlsx.utils.sheet_to_json(sheet);
    } else {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      return res.status(400).json({
        success: false,
        isInventoryError: true,
        message: "Unsupported file format.",
        reason: "Only CSV (.csv) and Excel (.xlsx, .xls) files are supported.",
        detectedColumns: [ext],
        requiredColumns: [".csv", ".xlsx", ".xls"],
      });
    }

    if (!rows || rows.length === 0) {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      return res.status(400).json({
        success: false,
        isInventoryError: true,
        message: "The uploaded file is empty or has no data rows.",
        reason: "Zero records found. Please ensure the file contains valid inventory data with headers.",
        detectedColumns: [],
        requiredColumns: ["SKU / Product Code", "Product Name", "Stock Quantity", "Unit Cost / Price"]
      });
    }

    // 🛑 VALIDATE DATASET: Ensure it is an authentic inventory dataset
    const validation = validateInventoryDataset(rows[0]);
    if (!validation.isValid) {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      return res.status(400).json({
        success: false,
        isInventoryError: true,
        message: "Invalid File: Not an inventory dataset.",
        reason: validation.reason,
        detectedColumns: validation.detectedColumns,
        requiredColumns: [
          "SKU / Product Code",
          "Product Name",
          "Stock Quantity",
          "Unit Cost / Price",
          "Category"
        ],
      });
    }

    // Record upload batch only after validation passes
    const [uploadResult]: any = await pool.query(
      "INSERT INTO upload_batches (workspace_id, filename, original_filename, file_type, file_size, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        DEFAULT_WORKSPACE_ID,
        safeFilename,
        safeOriginalName,
        safeFileType,
        size,
        "PROCESSING",
      ]
    );
    uploadBatchId = uploadResult.insertId;

    const skuMap = new Map<string, AggregatedItem>();
    const skuSalesMap = new Map<string, RawSalesRecord[]>();
    let duplicateRows = 0;
    let missingValueRows = 0;
    let rowIndex = 0;

    for (const row of rows) {
      rowIndex++;
      // Clean keys to lowercase alphanumeric only (strips spaces, underscores, hyphens, dots)
      const cleanRow: any = {};
      for (const key in row) {
        cleanRow[
          key
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
        ] = row[key];
      }

      // 1. Resolve SKU / Item ID
      const skuRaw =
        cleanRow["sku"] ||
        cleanRow["skucode"] ||
        cleanRow["skuid"] ||
        cleanRow["itemcode"] ||
        cleanRow["itemid"] ||
        cleanRow["productid"] ||
        cleanRow["productcode"] ||
        cleanRow["partnumber"] ||
        cleanRow["partno"] ||
        cleanRow["code"] ||
        cleanRow["id"] ||
        cleanRow["transactionid"] ||
        cleanRow["orderid"];

      // 2. Resolve Product Name
      const productNameRaw =
        cleanRow["productname"] ||
        cleanRow["product"] ||
        cleanRow["name"] ||
        cleanRow["title"] ||
        cleanRow["itemname"] ||
        cleanRow["description"] ||
        cleanRow["itemdescription"] ||
        cleanRow["item"] ||
        cleanRow["productcategory"] ||
        cleanRow["category"] ||
        cleanRow["catagory"];

      if (!skuRaw && !productNameRaw) {
        missingValueRows++;
        continue;
      }

      const sku = String(
        skuRaw ||
          `SKU-${String(productNameRaw)
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(0, 10)}-${rowIndex}`
      )
        .trim()
        .substring(0, 100);
      const productName = String(productNameRaw || sku)
        .trim()
        .substring(0, 255);

      const category = (
        cleanRow["category"] ||
        cleanRow["catagory"] ||
        cleanRow["productcategory"] ||
        cleanRow["cat"] ||
        cleanRow["type"] ||
        cleanRow["group"] ||
        cleanRow["department"] ||
        "General"
      )
        .toString()
        .trim()
        .substring(0, 150);

      const location =
        (
          cleanRow["location"] ||
          cleanRow["warehouselocation"] ||
          cleanRow["warehouse"] ||
          cleanRow["region"] ||
          cleanRow["branch"] ||
          cleanRow["store"] ||
          cleanRow["city"] ||
          cleanRow["country"]
        )
          ?.toString()
          .trim()
          .substring(0, 150) || null;

      const supplierName =
        (
          cleanRow["suppliername"] ||
          cleanRow["supplier"] ||
          cleanRow["vendorname"] ||
          cleanRow["vendor"]
        )
          ?.toString()
          .trim()
          .substring(0, 255) || null;

      let qty = Math.round(
        parseNumericValue(
          cleanRow["stockquantity"] ||
            cleanRow["stock"] ||
            cleanRow["quantity"] ||
            cleanRow["qty"] ||
            cleanRow["unitsinstock"] ||
            cleanRow["salesvolume"] ||
            cleanRow["inventoryquantity"],
          1
        )
      );

      let sales = parseNumericValue(
        cleanRow["sales"] ||
          cleanRow["totalsales"] ||
          cleanRow["revenue"] ||
          cleanRow["totalamount"] ||
          cleanRow["salesamount"],
        0
      );

      let cost = parseNumericValue(
        cleanRow["unitcost"] ||
          cleanRow["cost"] ||
          cleanRow["priceperunit"] ||
          cleanRow["unitprice"] ||
          cleanRow["price"] ||
          cleanRow["mrp"] ||
          cleanRow["rate"],
        0
      );

      let demand = Math.round(
        parseNumericValue(
          cleanRow["demandquantity"] ||
            cleanRow["demand"] ||
            cleanRow["salesquantity"] ||
            cleanRow["salesvolume"] ||
            cleanRow["volume"] ||
            cleanRow["monthlydemand"] ||
            cleanRow["orderquantity"],
          0
        )
      );

      let reorder = Math.round(
        parseNumericValue(
          cleanRow["reorderlevel"] ||
            cleanRow["reorderpoint"] ||
            cleanRow["reorder"] ||
            cleanRow["minstock"] ||
            cleanRow["safetystock"],
          0
        )
      );

      const reorderQty = Math.round(
        parseNumericValue(
          cleanRow["reorderquantity"] ||
            cleanRow["reorderqty"] ||
            cleanRow["orderqty"] ||
            cleanRow["batchsize"],
          0
        )
      );

      let targetStock = Math.round(
        parseNumericValue(
          cleanRow["targetstock"] ||
            cleanRow["target"] ||
            cleanRow["maxstock"] ||
            cleanRow["optimalstock"],
          0
        )
      );

      if (targetStock === 0 && reorder > 0 && reorderQty > 0) {
        targetStock = reorder + reorderQty;
      }

      if (qty <= 0) qty = 1;
      if (cost === 0 && sales > 0 && qty > 0) {
        cost = Number((sales / qty).toFixed(2));
      }

      // Extract transaction-level date for historical sales modeling if present
      const dateVal =
        cleanRow["orderdate"] ||
        cleanRow["date"] ||
        cleanRow["transactiondate"] ||
        cleanRow["datereceived"] ||
        cleanRow["lastorderdate"] ||
        cleanRow["createdat"];

      if (dateVal !== undefined && dateVal !== null && dateVal !== "") {
        if (!skuSalesMap.has(sku)) {
          skuSalesMap.set(sku, []);
        }
        skuSalesMap.get(sku)!.push({
          orderId: cleanRow["orderid"] || cleanRow["transactionid"],
          sku,
          date: dateVal,
          quantity: qty > 0 ? qty : 1,
        });
      }

      if (skuMap.has(sku)) {
        duplicateRows++;
        const existing = skuMap.get(sku)!;
        existing.stockQuantity += qty;
        existing.sales += sales;
        if (cost > 0)
          existing.unitCost = Number(
            ((existing.unitCost + cost) / 2).toFixed(2)
          );
        if (demand > 0) existing.demandQuantity += demand;
      } else {
        skuMap.set(sku, {
          sku,
          productName,
          category,
          location,
          supplierName,
          stockQuantity: qty,
          sales,
          unitCost: cost,
          demandQuantity: demand,
          reorderLevel: reorder,
          targetStock: targetStock,
          abcClass: cleanRow["abcclass"] || cleanRow["abc"],
          xyzClass: cleanRow["xyzclass"] || cleanRow["xyz"],
          fsnClass: cleanRow["fsnclass"] || cleanRow["fsn"],
          segment: cleanRow["segment"],
          status: cleanRow["status"],
        });
      }
    }

    const itemsList = Array.from(skuMap.values());

    if (itemsList.length === 0) {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      if (uploadBatchId) {
        await pool.query("DELETE FROM upload_batches WHERE id = ?", [uploadBatchId]);
      }
      return res.status(400).json({
        success: false,
        isInventoryError: true,
        message: "No valid inventory items found.",
        reason: "The file rows lacked valid SKU and Product Name values. Please verify your product columns.",
        detectedColumns: rows.length > 0 ? Object.keys(rows[0]) : [],
        requiredColumns: ["SKU / Product Code", "Product Name", "Stock Quantity", "Unit Cost"]
      });
    }

    // Calculate total inventory value and establish targets
    let grandTotalValue = 0;
    for (const item of itemsList) {
      if (item.unitCost === 0 && item.sales > 0 && item.stockQuantity > 0) {
        item.unitCost = Number((item.sales / item.stockQuantity).toFixed(2));
      }
      if (item.demandQuantity === 0) {
        item.demandQuantity = Math.max(1, Math.round(item.stockQuantity * 0.7));
      }
      if (item.reorderLevel === 0) {
        item.reorderLevel = Math.max(1, Math.round(item.stockQuantity * 0.3));
      }
      if (item.targetStock === 0) {
        if (item.reorderLevel > 0) {
          item.targetStock = Math.round(item.reorderLevel * 1.5);
        } else {
          item.targetStock = item.demandQuantity;
        }
      }
      if (item.targetStock < item.reorderLevel) {
        item.targetStock = Math.round(item.reorderLevel * 1.4);
      }
      grandTotalValue += item.stockQuantity * item.unitCost;
    }

    // Dynamic ABC classification if not explicitly given
    itemsList.sort(
      (a, b) => b.stockQuantity * b.unitCost - a.stockQuantity * a.unitCost
    );
    let runningValue = 0;
    for (const item of itemsList) {
      const invVal = item.stockQuantity * item.unitCost;
      runningValue += invVal;
      const cumRatio = grandTotalValue > 0 ? runningValue / grandTotalValue : 0;

      if (!item.abcClass) {
        if (cumRatio <= 0.8) item.abcClass = "A";
        else if (cumRatio <= 0.95) item.abcClass = "B";
        else item.abcClass = "C";
      }

      if (!item.xyzClass) {
        item.xyzClass =
          item.demandQuantity > 50 ? "X" : item.demandQuantity > 20 ? "Y" : "Z";
      }

      if (!item.fsnClass) {
        item.fsnClass =
          item.stockQuantity > 50 ? "F" : item.stockQuantity > 15 ? "S" : "N";
      }

      if (!item.segment) {
        item.segment = `${item.abcClass}-${item.xyzClass}-${item.fsnClass}`;
      }

      const validStatuses = ["EXCESS", "UNDERSTOCK", "OPTIMIZED"];
      const rawStatus = (item.status || "").trim().toUpperCase();

      if (validStatuses.includes(rawStatus)) {
        item.status = rawStatus;
      } else {
        if (item.reorderLevel > 0 && item.stockQuantity < item.reorderLevel) {
          item.status = "UNDERSTOCK";
        } else if (item.stockQuantity > item.targetStock) {
          item.status = "EXCESS";
        } else {
          item.status = "OPTIMIZED";
        }
      }
    }

    // Chunked batch insert into database
    const CHUNK_SIZE = 250;
    let validRows = 0;
    let invalidRows = missingValueRows;

    for (let i = 0; i < itemsList.length; i += CHUNK_SIZE) {
      const chunk = itemsList.slice(i, i + CHUNK_SIZE);
      const values: any[] = [];
      const placeholders: string[] = [];

      for (const item of chunk) {
        const invVal = Number((item.stockQuantity * item.unitCost).toFixed(2));
        const excessQty =
          item.status === "UNDERSTOCK"
            ? 0
            : Math.max(0, item.stockQuantity - item.targetStock);
        const excessVal = Number((excessQty * item.unitCost).toFixed(2));
        const recordStatus =
          item.stockQuantity === 0 ? "OUT_OF_STOCK" : "ACTIVE";

        placeholders.push(
          "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        values.push(
          DEFAULT_WORKSPACE_ID,
          uploadBatchId,
          item.sku,
          item.productName,
          item.category,
          item.location,
          item.supplierName,
          item.abcClass,
          item.xyzClass,
          item.fsnClass,
          item.segment,
          item.status,
          item.targetStock,
          item.stockQuantity,
          item.unitCost,
          invVal,
          item.demandQuantity,
          item.reorderLevel,
          excessQty,
          excessVal,
          recordStatus
        );
      }

      const insertSql = `
        INSERT INTO inventory_items (
          workspace_id, upload_batch_id, sku, product_name, category, location, supplier_name,
          abc_class, xyz_class, fsn_class, segment, status, target_stock, stock_quantity, unit_cost, inventory_value,
          demand_quantity, reorder_level, excess_quantity, excess_value, record_status
        ) VALUES ${placeholders.join(", ")}
        ON DUPLICATE KEY UPDATE 
          product_name = VALUES(product_name),
          category = VALUES(category),
          location = VALUES(location),
          supplier_name = VALUES(supplier_name),
          abc_class = VALUES(abc_class),
          xyz_class = VALUES(xyz_class),
          fsn_class = VALUES(fsn_class),
          segment = VALUES(segment),
          status = VALUES(status),
          target_stock = VALUES(target_stock),
          stock_quantity = VALUES(stock_quantity),
          unit_cost = VALUES(unit_cost),
          inventory_value = VALUES(inventory_value),
          demand_quantity = VALUES(demand_quantity),
          reorder_level = VALUES(reorder_level),
          excess_quantity = VALUES(excess_quantity),
          excess_value = VALUES(excess_value),
          record_status = VALUES(record_status),
          upload_batch_id = VALUES(upload_batch_id)
      `;

      try {
        await pool.query(insertSql, values);
        validRows += chunk.length;
      } catch (err: any) {
        console.error("Batch insert error:", err);
        invalidRows += chunk.length;
      }
    }

    // Auto-generate pending approval recommendations for significant excess value items and critical understock items
    try {
      const [topExcess]: any = await pool.query(
        `
        SELECT id, sku, product_name, excess_quantity, excess_value 
        FROM inventory_items 
        WHERE workspace_id = ? AND excess_value > 20000 AND id NOT IN (SELECT inventory_item_id FROM approval_requests WHERE inventory_item_id IS NOT NULL)
        ORDER BY excess_value DESC 
        LIMIT 5
      `,
        [DEFAULT_WORKSPACE_ID]
      );

      for (const item of topExcess) {
        await pool.query(
          `
          INSERT INTO approval_requests (inventory_item_id, sku, reason, excess_quantity, excess_value, status)
          VALUES (?, ?, ?, ?, ?, 'PENDING')
        `,
          [
            item.id,
            item.sku,
            `Reallocate excess capital: ${item.excess_quantity} units above target`,
            item.excess_quantity,
            item.excess_value,
          ]
        );
      }

      const [topUnderstock]: any = await pool.query(
        `
        SELECT id, sku, product_name, stock_quantity, reorder_level, target_stock, unit_cost 
        FROM inventory_items 
        WHERE workspace_id = ? AND status = 'UNDERSTOCK' AND id NOT IN (SELECT inventory_item_id FROM approval_requests WHERE inventory_item_id IS NOT NULL)
        ORDER BY (reorder_level - stock_quantity) DESC 
        LIMIT 5
      `,
        [DEFAULT_WORKSPACE_ID]
      );

      for (const item of topUnderstock) {
        const reorderQty = Math.max(1, (item.target_stock || item.reorder_level * 2) - item.stock_quantity);
        const estimatedCost = Number((reorderQty * item.unit_cost).toFixed(2));
        await pool.query(
          `
          INSERT INTO approval_requests (inventory_item_id, sku, reason, excess_quantity, excess_value, status)
          VALUES (?, ?, ?, ?, ?, 'PENDING')
        `,
          [
            item.id,
            item.sku,
            `Urgent stock reorder: ${reorderQty} units required (Stock: ${item.stock_quantity}, Reorder Pt: ${item.reorder_level})`,
            -reorderQty,
            estimatedCost,
          ]
        );
      }
    } catch (e) {
      console.warn("Auto approval trigger warning:", e);
    }

    // Optional Phase 2: Feature-Flagged ML Demand Forecasting & Recommendations
    if (process.env.ENABLE_ML === "true") {
      try {
        const [insertedRows]: any = await pool.query(
          "SELECT id, sku FROM inventory_items WHERE workspace_id = ?",
          [DEFAULT_WORKSPACE_ID]
        );
        const insertedItemMap = new Map<string, number>();
        for (const r of insertedRows) {
          insertedItemMap.set(r.sku, r.id);
        }

        const historicalItems = itemsList.map(item => ({
          sku: item.sku,
          stockQuantity: item.stockQuantity,
          targetStock: item.targetStock,
          unitCost: item.unitCost,
          salesRecords: skuSalesMap.get(item.sku) || [],
        }));

        await Promise.race([
          processInventoryBatchWithML(
            DEFAULT_WORKSPACE_ID,
            historicalItems,
            insertedItemMap
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("ML_TIMEOUT")), 3000)
          ),
        ]);
      } catch (mlErr: any) {
        console.warn(
          "[ML_SERVICE] ML processing skipped or encountered non-fatal error:",
          mlErr?.message
        );
      }
    }

    await pool.query(
      "UPDATE upload_batches SET total_rows = ?, valid_rows = ?, invalid_rows = ?, duplicate_rows = ?, missing_value_rows = ?, status = ? WHERE id = ?",
      [
        rows.length,
        validRows,
        invalidRows,
        duplicateRows,
        missingValueRows,
        "COMPLETED",
        uploadBatchId,
      ]
    );

    // Compute batch inventory intelligence analysis for immediate feedback
    let batchAnalysis = {
      total_count: validRows,
      total_inventory_value: 0,
      total_excess_value: 0,
      excess_count: 0,
      understock_count: 0,
      optimized_count: 0,
      class_a_count: 0,
      class_b_count: 0,
      class_c_count: 0,
    };

    if (uploadBatchId) {
      try {
        const [[stats]]: any = await pool.query(
          `
          SELECT 
            COUNT(id) as total_count,
            COALESCE(SUM(inventory_value), 0) as total_inventory_value,
            COALESCE(SUM(excess_value), 0) as total_excess_value,
            COALESCE(SUM(CASE WHEN status = 'EXCESS' THEN 1 ELSE 0 END), 0) as excess_count,
            COALESCE(SUM(CASE WHEN status = 'UNDERSTOCK' THEN 1 ELSE 0 END), 0) as understock_count,
            COALESCE(SUM(CASE WHEN status = 'OPTIMIZED' THEN 1 ELSE 0 END), 0) as optimized_count,
            COALESCE(SUM(CASE WHEN abc_class = 'A' THEN 1 ELSE 0 END), 0) as class_a_count,
            COALESCE(SUM(CASE WHEN abc_class = 'B' THEN 1 ELSE 0 END), 0) as class_b_count,
            COALESCE(SUM(CASE WHEN abc_class = 'C' THEN 1 ELSE 0 END), 0) as class_c_count
          FROM inventory_items 
          WHERE workspace_id = ? AND upload_batch_id = ?
        `,
          [DEFAULT_WORKSPACE_ID, uploadBatchId]
        );
        if (stats) {
          batchAnalysis = {
            total_count: Number(stats.total_count || validRows),
            total_inventory_value: Number(stats.total_inventory_value || 0),
            total_excess_value: Number(stats.total_excess_value || 0),
            excess_count: Number(stats.excess_count || 0),
            understock_count: Number(stats.understock_count || 0),
            optimized_count: Number(stats.optimized_count || 0),
            class_a_count: Number(stats.class_a_count || 0),
            class_b_count: Number(stats.class_b_count || 0),
            class_c_count: Number(stats.class_c_count || 0),
          };
        }
      } catch (statErr) {
        console.warn("Failed to compute batch analysis:", statErr);
      }
    }

    // Clean up uploaded temp file
    fs.unlink(filePath, () => {});

    res.json({
      success: true,
      data: {
        uploadBatchId,
        filename: originalname,
        totalRows: rows.length,
        validRows,
        invalidRows,
        duplicateRows,
        missingValues: missingValueRows,
        analysis: batchAnalysis,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    if (uploadBatchId) {
      await pool
        .query("UPDATE upload_batches SET status = ? WHERE id = ?", [
          "FAILED",
          uploadBatchId,
        ])
        .catch(() => {});
    }
    // Clean up uploaded temp file
    fs.unlink(filePath, () => {});
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to process file",
    });
  }
};

export const getUploadHistory = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT 
        ub.*,
        COALESCE(inv.batch_inventory_value, 0) as batch_inventory_value,
        COALESCE(inv.batch_excess_value, 0) as batch_excess_value,
        COALESCE(inv.excess_count, 0) as excess_count,
        COALESCE(inv.understock_count, 0) as understock_count,
        COALESCE(inv.optimized_count, 0) as optimized_count,
        COALESCE(inv.class_a_count, 0) as class_a_count,
        COALESCE(inv.class_b_count, 0) as class_b_count,
        COALESCE(inv.class_c_count, 0) as class_c_count
      FROM upload_batches ub
      LEFT JOIN (
        SELECT 
          upload_batch_id,
          SUM(inventory_value) as batch_inventory_value,
          SUM(excess_value) as batch_excess_value,
          SUM(CASE WHEN status = 'EXCESS' THEN 1 ELSE 0 END) as excess_count,
          SUM(CASE WHEN status = 'UNDERSTOCK' THEN 1 ELSE 0 END) as understock_count,
          SUM(CASE WHEN status = 'OPTIMIZED' THEN 1 ELSE 0 END) as optimized_count,
          SUM(CASE WHEN abc_class = 'A' THEN 1 ELSE 0 END) as class_a_count,
          SUM(CASE WHEN abc_class = 'B' THEN 1 ELSE 0 END) as class_b_count,
          SUM(CASE WHEN abc_class = 'C' THEN 1 ELSE 0 END) as class_c_count
        FROM inventory_items
        WHERE workspace_id = ?
        GROUP BY upload_batch_id
      ) inv ON ub.id = inv.upload_batch_id
      WHERE ub.workspace_id = ? 
      ORDER BY ub.id DESC 
      LIMIT 10`,
      [DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_ID]
    );

    const enrichedRows = rows.map((r: any) => ({
      ...r,
      batch_inventory_value: Number(r.batch_inventory_value || 0),
      batch_excess_value: Number(r.batch_excess_value || 0),
      excess_count: Number(r.excess_count || 0),
      understock_count: Number(r.understock_count || 0),
      optimized_count: Number(r.optimized_count || 0),
      class_a_count: Number(r.class_a_count || 0),
      class_b_count: Number(r.class_b_count || 0),
      class_c_count: Number(r.class_c_count || 0),
    }));

    res.json({ success: true, data: enrichedRows });
  } catch (error) {
    console.error("Error fetching upload history:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch upload history" });
  }
};

export const getUploadDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query(
      `SELECT 
        ub.*,
        COALESCE(inv.batch_inventory_value, 0) as batch_inventory_value,
        COALESCE(inv.batch_excess_value, 0) as batch_excess_value,
        COALESCE(inv.excess_count, 0) as excess_count,
        COALESCE(inv.understock_count, 0) as understock_count,
        COALESCE(inv.optimized_count, 0) as optimized_count,
        COALESCE(inv.class_a_count, 0) as class_a_count,
        COALESCE(inv.class_b_count, 0) as class_b_count,
        COALESCE(inv.class_c_count, 0) as class_c_count
      FROM upload_batches ub
      LEFT JOIN (
        SELECT 
          upload_batch_id,
          SUM(inventory_value) as batch_inventory_value,
          SUM(excess_value) as batch_excess_value,
          SUM(CASE WHEN status = 'EXCESS' THEN 1 ELSE 0 END) as excess_count,
          SUM(CASE WHEN status = 'UNDERSTOCK' THEN 1 ELSE 0 END) as understock_count,
          SUM(CASE WHEN status = 'OPTIMIZED' THEN 1 ELSE 0 END) as optimized_count,
          SUM(CASE WHEN abc_class = 'A' THEN 1 ELSE 0 END) as class_a_count,
          SUM(CASE WHEN abc_class = 'B' THEN 1 ELSE 0 END) as class_b_count,
          SUM(CASE WHEN abc_class = 'C' THEN 1 ELSE 0 END) as class_c_count
        FROM inventory_items
        WHERE workspace_id = ? AND upload_batch_id = ?
        GROUP BY upload_batch_id
      ) inv ON ub.id = inv.upload_batch_id
      WHERE ub.id = ? AND ub.workspace_id = ?`,
      [DEFAULT_WORKSPACE_ID, id, id, DEFAULT_WORKSPACE_ID]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Upload not found" });
    }

    const r = rows[0];
    const enrichedRow = {
      ...r,
      batch_inventory_value: Number(r.batch_inventory_value || 0),
      batch_excess_value: Number(r.batch_excess_value || 0),
      excess_count: Number(r.excess_count || 0),
      understock_count: Number(r.understock_count || 0),
      optimized_count: Number(r.optimized_count || 0),
      class_a_count: Number(r.class_a_count || 0),
      class_b_count: Number(r.class_b_count || 0),
      class_c_count: Number(r.class_c_count || 0),
    };

    res.json({ success: true, data: enrichedRow });
  } catch (error) {
    console.error("Error fetching upload details:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch upload details" });
  }
};
