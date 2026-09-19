import { Request, Response } from 'express';
import { pool } from '../config/database';

const DEFAULT_WORKSPACE_ID = 1;

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const [[summary]]: any = await pool.query(`
      SELECT 
        SUM(inventory_value) as total_inventory_value,
        COUNT(id) as total_skus,
        SUM(excess_value) as total_excess_value,
        (SUM(excess_value) / NULLIF(SUM(inventory_value), 0)) * 100 as excess_percentage,
        SUM(CASE WHEN status = 'EXCESS' THEN 1 ELSE 0 END) as excess_items,
        SUM(CASE WHEN status = 'OPTIMIZED' THEN 1 ELSE 0 END) as optimized_items,
        SUM(CASE WHEN status = 'UNDERSTOCK' THEN 1 ELSE 0 END) as understocked_items
      FROM inventory_items
      WHERE workspace_id = ?
    `, [DEFAULT_WORKSPACE_ID]);

    const [[pendingApprovals]]: any = await pool.query(`
      SELECT COUNT(*) as items_needing_review FROM approval_requests WHERE status = 'PENDING'
    `);

    res.json({
      success: true,
      data: {
        totalInventoryValue: summary?.total_inventory_value || 0,
        totalSkus: summary?.total_skus || 0,
        excessValue: summary?.total_excess_value || 0,
        excessPercentage: summary?.excess_percentage || 0,
        excessItems: summary?.excess_items || 0,
        itemsNeedingReview: pendingApprovals?.items_needing_review || 0,
        optimizedItems: summary?.optimized_items || 0,
        understockedItems: summary?.understocked_items || 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
  }
};

export const getRecentAlerts = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT * FROM inventory_items 
      WHERE status IN ('EXCESS', 'UNDERSTOCK') AND workspace_id = ?
      ORDER BY 
        CASE WHEN status = 'UNDERSTOCK' THEN 1 ELSE 2 END,
        excess_value DESC,
        id DESC 
      LIMIT 8
    `, [DEFAULT_WORKSPACE_ID]);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent alerts' });
  }
};
