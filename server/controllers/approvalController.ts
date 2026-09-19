import { Request, Response } from 'express';
import { pool } from '../config/database';
import crypto from 'crypto';

export const getApprovals = async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'PENDING';
    const [rows]: any = await pool.query(`
      SELECT 
        ar.*, 
        COALESCE(ar.product_name, i.product_name, ar.sku) as name 
      FROM approval_requests ar
      LEFT JOIN inventory_items i ON ar.inventory_item_id = i.id
      WHERE ar.status = ?
      ORDER BY ar.created_at DESC
    `, [status]);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch approvals' });
  }
};

export const createApproval = async (req: Request, res: Response) => {
  try {
    const { inventory_item_id, sku, product_name, reason, excess_quantity, excess_value } = req.body;
    
    const [result]: any = await pool.query(`
      INSERT INTO approval_requests (inventory_item_id, sku, product_name, reason, excess_quantity, excess_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [inventory_item_id, sku, product_name, reason, excess_quantity, excess_value]);
    
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('Error creating approval:', error);
    res.status(500).json({ success: false, message: 'Failed to create approval request' });
  }
};

export const approveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;
    
    await pool.query(`
      UPDATE approval_requests 
      SET status = 'APPROVED', approved_by = ?, approved_at = NOW() 
      WHERE id = ?
    `, [approved_by || 'Manager', id]);
    
    // Log to blockchain simulation with resolved product name
    const [request]: any = await pool.query(`
      SELECT 
        ar.*, 
        COALESCE(ar.product_name, i.product_name, ar.sku) as product_name
      FROM approval_requests ar
      LEFT JOIN inventory_items i ON ar.inventory_item_id = i.id
      WHERE ar.id = ?
    `, [id]);
    if (request.length > 0) {
      await logToBlockchain(request[0].sku, 'POLICY_APPROVED', request[0]);
    }
    
    res.json({ success: true, message: 'Request approved successfully' });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ success: false, message: 'Failed to approve request' });
  }
};

export const rejectRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;
    
    await pool.query(`
      UPDATE approval_requests 
      SET status = 'REJECTED', approved_by = ?, approved_at = NOW() 
      WHERE id = ?
    `, [approved_by || 'Manager', id]);
    
    // Log to blockchain simulation with resolved product name
    const [request]: any = await pool.query(`
      SELECT 
        ar.*, 
        COALESCE(ar.product_name, i.product_name, ar.sku) as product_name
      FROM approval_requests ar
      LEFT JOIN inventory_items i ON ar.inventory_item_id = i.id
      WHERE ar.id = ?
    `, [id]);
    if (request.length > 0) {
      await logToBlockchain(request[0].sku, 'POLICY_REJECTED', request[0]);
    }
    
    res.json({ success: true, message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
};

async function logToBlockchain(sku: string, action: string, data: any) {
  const dataString = JSON.stringify(data);
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  const recordId = `REC${Date.now().toString().slice(-6)}`;
  const productName = data.product_name || data.name || sku;
  
  await pool.query(`
    INSERT INTO blockchain_logs (record_id, sku, product_name, action, data_hash, verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [recordId, sku, productName, action, `0x${hash}`, true]);
}
