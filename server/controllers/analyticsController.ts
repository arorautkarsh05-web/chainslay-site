import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getSegmentationStats = async (req: Request, res: Response) => {
  try {
    const batchId = req.query.batch_id || req.query.batch;
    let whereClause = "";
    const params: any[] = [];
    if (batchId) {
      whereClause = "WHERE upload_batch_id = ?";
      params.push(parseInt(batchId as string, 10));
    }

    const totalSubquery = batchId 
      ? `(SELECT SUM(inventory_value) FROM inventory_items WHERE upload_batch_id = ${parseInt(batchId as string, 10)})`
      : `(SELECT SUM(inventory_value) FROM inventory_items)`;

    const [rows]: any = await pool.query(`
      SELECT 
        COALESCE(abc_class, 'Unassigned') as abc_class, 
        COUNT(*) as count, 
        COALESCE(SUM(inventory_value), 0) as value, 
        COALESCE(SUM(inventory_value) / NULLIF(${totalSubquery}, 0) * 100, 0) as percentage 
      FROM inventory_items 
      ${whereClause}
      GROUP BY abc_class
    `, params);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching segmentation stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch segmentation stats' });
  }
};

export const getInventorySummary = async (req: Request, res: Response) => {
  try {
    const batchId = req.query.batch_id || req.query.batch;
    let whereClause = "";
    const params: any[] = [];
    if (batchId) {
      whereClause = "WHERE upload_batch_id = ?";
      params.push(parseInt(batchId as string, 10));
    }

    const [[summary]]: any = await pool.query(`
      SELECT 
        COUNT(*) as total_skus,
        COALESCE(SUM(inventory_value), 0) as total_inventory_value,
        COALESCE(SUM(excess_value), 0) as total_excess_value,
        COALESCE(SUM(CASE WHEN abc_class = 'A' THEN 1 ELSE 0 END), 0) as class_a_count,
        COALESCE(SUM(CASE WHEN abc_class = 'B' THEN 1 ELSE 0 END), 0) as class_b_count,
        COALESCE(SUM(CASE WHEN abc_class = 'C' THEN 1 ELSE 0 END), 0) as class_c_count,
        COALESCE(SUM(CASE WHEN status = 'EXCESS' THEN 1 ELSE 0 END), 0) as excess_stock_count,
        COALESCE(SUM(CASE WHEN status = 'UNDERSTOCK' THEN 1 ELSE 0 END), 0) as understock_count,
        COALESCE(SUM(CASE WHEN status = 'OPTIMIZED' THEN 1 ELSE 0 END), 0) as optimized_count
      FROM inventory_items
      ${whereClause}
    `, params);

    const [categoryValue]: any = await pool.query(`
      SELECT COALESCE(category, 'General') as category, COALESCE(SUM(inventory_value), 0) as total_value 
      FROM inventory_items 
      ${whereClause}
      GROUP BY category
    `, params);

    const [segmentValue]: any = await pool.query(`
      SELECT COALESCE(segment, 'UNASSIGNED') as segment, COALESCE(SUM(inventory_value), 0) as total_value 
      FROM inventory_items 
      ${whereClause}
      GROUP BY segment
    `, params);

    res.json({
      success: true,
      data: {
        summary: {
          total_skus: Number(summary?.total_skus || 0),
          total_inventory_value: Number(summary?.total_inventory_value || 0),
          total_excess_value: Number(summary?.total_excess_value || 0),
          class_a_count: Number(summary?.class_a_count || 0),
          class_b_count: Number(summary?.class_b_count || 0),
          class_c_count: Number(summary?.class_c_count || 0),
          excess_stock_count: Number(summary?.excess_stock_count || 0),
          understock_count: Number(summary?.understock_count || 0),
          optimized_count: Number(summary?.optimized_count || 0),
        },
        categoryValue,
        segmentValue
      }
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics summary' });
  }
};
