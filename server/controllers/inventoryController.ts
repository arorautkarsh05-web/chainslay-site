import { Request, Response } from "express";
import { pool } from "../config/database";
import { z } from "zod";

const DEFAULT_WORKSPACE_ID = 1; // Used for development

const inventorySchema = z.object({
  sku: z.string().min(1),
  product_name: z.string().min(1),
  category: z.string().optional(),
  location: z.string().optional(),
  supplier_name: z.string().optional(),
  abc_class: z.string().optional(),
  xyz_class: z.string().optional(),
  fsn_class: z.string().optional(),
  stock_quantity: z.number().int().default(0),
  unit_cost: z.number().default(0),
  demand_quantity: z.number().int().optional().default(0),
  reorder_level: z.number().int().optional().default(0),
});

export const getInventory = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const batchId = req.query.batch_id || req.query.batch;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM inventory_items WHERE workspace_id = ?";
    const params: any[] = [DEFAULT_WORKSPACE_ID];

    if (batchId) {
      query += " AND upload_batch_id = ?";
      params.push(parseInt(batchId as string, 10));
    }

    if (status && status !== "ALL") {
      query += " AND status = ?";
      params.push(status);
    }

    if (search) {
      query += " AND (sku LIKE ? OR product_name LIKE ? OR category LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
    const [countRows]: any = await pool.query(countQuery, params);
    const total = countRows[0].total;

    // Summary statistics scoped to workspace and optional batch
    let statsQuery = `
      SELECT 
        COUNT(id) as total_count,
        COALESCE(SUM(inventory_value), 0) as total_inventory_value,
        COALESCE(SUM(excess_value), 0) as total_excess_value,
        COALESCE(SUM(CASE WHEN status = 'EXCESS' THEN 1 ELSE 0 END), 0) as excess_count,
        COALESCE(SUM(CASE WHEN status = 'UNDERSTOCK' THEN 1 ELSE 0 END), 0) as understock_count,
        COALESCE(SUM(CASE WHEN status = 'OPTIMIZED' THEN 1 ELSE 0 END), 0) as optimized_count
      FROM inventory_items 
      WHERE workspace_id = ?
    `;
    const statsParams: any[] = [DEFAULT_WORKSPACE_ID];
    if (batchId) {
      statsQuery += " AND upload_batch_id = ?";
      statsParams.push(parseInt(batchId as string, 10));
    }
    const [[summaryStats]]: any = await pool.query(statsQuery, statsParams);

    const formattedSummary = {
      total_count: Number(summaryStats?.total_count || total),
      total_inventory_value: Number(summaryStats?.total_inventory_value || 0),
      total_excess_value: Number(summaryStats?.total_excess_value || 0),
      excess_count: Number(summaryStats?.excess_count || 0),
      understock_count: Number(summaryStats?.understock_count || 0),
      optimized_count: Number(summaryStats?.optimized_count || 0),
    };

    query += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows]: any = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        items: rows,
        summary: formattedSummary,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch inventory" });
  }
};

export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query(
      "SELECT * FROM inventory_items WHERE id = ? AND workspace_id = ?",
      [id, DEFAULT_WORKSPACE_ID]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error fetching inventory by ID:", error);
    res.status(500).json({ success: false, message: "Failed to fetch item" });
  }
};

export const getInventoryBySku = async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;
    const [rows]: any = await pool.query(
      "SELECT * FROM inventory_items WHERE sku = ? AND workspace_id = ?",
      [sku, DEFAULT_WORKSPACE_ID]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error fetching inventory by SKU:", error);
    res.status(500).json({ success: false, message: "Failed to fetch item" });
  }
};

export const createInventory = async (req: Request, res: Response) => {
  try {
    const data = inventorySchema.parse(req.body);
    const inventory_value = data.stock_quantity * data.unit_cost;
    const excess_quantity = Math.max(
      0,
      data.stock_quantity - data.demand_quantity
    );
    const excess_value = excess_quantity * data.unit_cost;

    const [result]: any = await pool.query(
      `INSERT INTO inventory_items (
        workspace_id, sku, product_name, category, location, supplier_name,
        abc_class, xyz_class, fsn_class, stock_quantity, unit_cost, inventory_value,
        demand_quantity, reorder_level, excess_quantity, excess_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DEFAULT_WORKSPACE_ID,
        data.sku,
        data.product_name,
        data.category,
        data.location,
        data.supplier_name,
        data.abc_class,
        data.xyz_class,
        data.fsn_class,
        data.stock_quantity,
        data.unit_cost,
        inventory_value,
        data.demand_quantity,
        data.reorder_level,
        excess_quantity,
        excess_value,
      ]
    );

    res
      .status(201)
      .json({ success: true, data: { id: result.insertId, ...data } });
  } catch (error) {
    console.error("Error creating inventory:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    }
    res.status(500).json({ success: false, message: "Failed to create item" });
  }
};

export const updateInventory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = inventorySchema.parse(req.body);
    const inventory_value = data.stock_quantity * data.unit_cost;
    const excess_quantity = Math.max(
      0,
      data.stock_quantity - data.demand_quantity
    );
    const excess_value = excess_quantity * data.unit_cost;

    const [result]: any = await pool.query(
      `UPDATE inventory_items SET 
        sku=?, product_name=?, category=?, location=?, supplier_name=?,
        abc_class=?, xyz_class=?, fsn_class=?, stock_quantity=?, unit_cost=?, inventory_value=?,
        demand_quantity=?, reorder_level=?, excess_quantity=?, excess_value=?
      WHERE id=? AND workspace_id=?`,
      [
        data.sku,
        data.product_name,
        data.category,
        data.location,
        data.supplier_name,
        data.abc_class,
        data.xyz_class,
        data.fsn_class,
        data.stock_quantity,
        data.unit_cost,
        inventory_value,
        data.demand_quantity,
        data.reorder_level,
        excess_quantity,
        excess_value,
        id,
        DEFAULT_WORKSPACE_ID,
      ]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, message: "Item updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    }
    res.status(500).json({ success: false, message: "Failed to update item" });
  }
};

export const deleteInventory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [result]: any = await pool.query(
      "DELETE FROM inventory_items WHERE id=? AND workspace_id=?",
      [id, DEFAULT_WORKSPACE_ID]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    res.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete item" });
  }
};

export const getItemForecasts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query(
      "SELECT * FROM forecasts WHERE inventory_item_id = ? AND workspace_id = ? ORDER BY id DESC LIMIT 10",
      [id, DEFAULT_WORKSPACE_ID]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching forecasts:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch forecasts" });
  }
};

export const getItemRecommendations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query(
      "SELECT * FROM recommendations WHERE inventory_item_id = ? AND workspace_id = ? ORDER BY id DESC LIMIT 10",
      [id, DEFAULT_WORKSPACE_ID]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch recommendations" });
  }
};
