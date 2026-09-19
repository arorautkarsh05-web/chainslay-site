import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getBlockchainLogs = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT * FROM blockchain_logs 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching blockchain logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blockchain logs' });
  }
};
