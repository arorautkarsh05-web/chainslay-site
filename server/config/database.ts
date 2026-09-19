import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const isRemoteHost = Boolean(
  process.env.DB_HOST &&
  !process.env.DB_HOST.includes('127.0.0.1') &&
  !process.env.DB_HOST.includes('localhost')
);

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'chainslay_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' || isRemoteHost
    ? { minVersion: 'TLSv1.2', rejectUnauthorized: false }
    : undefined,
};

export const pool = mysql.createPool(dbConfig);

export const verifyConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to the database.');
    connection.release();
    return true;
  } catch (error) {
    console.error('Failed to connect to the database. Please verify your .env credentials and ensure MySQL is running.', error);
    return false;
  }
};
