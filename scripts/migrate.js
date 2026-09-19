import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'chainslay_db',
  });

  console.log('Connected to MySQL. Checking columns...');

  const checkAndAddColumn = async (table, column, colDef) => {
    const [cols] = await conn.query(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [process.env.DB_NAME || 'chainslay_db', table, column]
    );
    if (cols.length === 0) {
      console.log(`Adding ${column} to ${table}...`);
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${colDef}`);
    } else {
      console.log(`Column ${column} already exists on ${table}.`);
    }
  };

  await checkAndAddColumn('inventory_items', 'status', "VARCHAR(30) DEFAULT 'OPTIMIZED'");
  await checkAndAddColumn('inventory_items', 'target_stock', 'INT DEFAULT 0');
  await checkAndAddColumn('inventory_items', 'segment', "VARCHAR(30) DEFAULT 'A-X-F'");
  await checkAndAddColumn('upload_batches', 'duplicate_rows', 'INT DEFAULT 0');
  await checkAndAddColumn('upload_batches', 'missing_value_rows', 'INT DEFAULT 0');

  console.log('Ensuring tables exist...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS approval_requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      inventory_item_id INT,
      sku VARCHAR(100),
      reason TEXT,
      excess_quantity INT,
      excess_value DECIMAL(15,2),
      status VARCHAR(30) DEFAULT 'PENDING',
      approved_by VARCHAR(150),
      approved_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS blockchain_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      record_id VARCHAR(100),
      sku VARCHAR(100),
      action VARCHAR(100),
      version INT DEFAULT 1,
      data_hash VARCHAR(255),
      verified BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database migration completed successfully.');
  await conn.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
