import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const isRemote = Boolean(process.env.DB_HOST && !process.env.DB_HOST.includes('127.0.0.1') && !process.env.DB_HOST.includes('localhost'));
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'chainslay_db',
    ssl: process.env.DB_SSL === 'true' || isRemote ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined,
  });

  console.log('Connected to MySQL for seeding...');

  // Ensure workspace 1 exists
  await conn.query('INSERT IGNORE INTO workspaces (id, name) VALUES (1, "Default Workspace")');

  // Check if inventory_items has records
  const [existingItems] = await conn.query('SELECT COUNT(*) as count FROM inventory_items WHERE workspace_id = 1');
  if (existingItems[0].count === 0) {
    console.log('Seeding initial inventory items...');
    await conn.query(`
      INSERT INTO inventory_items (
        workspace_id, sku, product_name, category, stock_quantity, target_stock, unit_cost, inventory_value,
        abc_class, xyz_class, fsn_class, segment, status, record_status, excess_quantity, excess_value
      ) VALUES
      (1, 'SKU001', 'Electronic Motor 24V', 'Electronics', 1000, 300, 500.00, 500000.00, 'A', 'X', 'F', 'A-X-F', 'EXCESS', 'ACTIVE', 700, 350000.00),
      (1, 'SKU042', 'Cooling Fan V2 Brushless', 'Electronics', 450, 400, 250.00, 112500.00, 'B', 'Y', 'F', 'B-Y-F', 'EXCESS', 'ACTIVE', 50, 12500.00),
      (1, 'SKU089', 'Copper Wiring Harness (10m)', 'Electrical', 2100, 500, 500.00, 1050000.00, 'A', 'Z', 'S', 'A-Z-S', 'EXCESS', 'ACTIVE', 1600, 800000.00),
      (1, 'SKU112', 'Steel Mounting Bracket', 'Hardware', 80, 100, 50.00, 4000.00, 'C', 'X', 'F', 'C-X-F', 'UNDERSTOCK', 'ACTIVE', 0, 0.00),
      (1, 'SKU155', 'Micro Controller Board rev 3', 'Electronics', 50, 20, 5000.00, 250000.00, 'A', 'X', 'S', 'A-X-S', 'EXCESS', 'ACTIVE', 30, 150000.00),
      (1, 'SKU204', 'Industrial Hex Nut M8 (Pack 100)', 'Fasteners', 3200, 2500, 12.50, 40000.00, 'C', 'Y', 'N', 'C-Y-N', 'EXCESS', 'ACTIVE', 700, 8750.00),
      (1, 'SKU310', 'Power Supply 12V 10A DIN Rail', 'Electronics', 15, 50, 1200.00, 18000.00, 'B', 'Z', 'F', 'B-Z-F', 'UNDERSTOCK', 'ACTIVE', 0, 0.00),
      (1, 'SKU408', 'Precision Bearing 608RS', 'Mechanical', 600, 600, 85.00, 51000.00, 'C', 'X', 'F', 'C-X-F', 'OPTIMIZED', 'ACTIVE', 0, 0.00)
    `);

    console.log('Seeding initial upload batch...');
    await conn.query(`
      INSERT INTO upload_batches (
        workspace_id, filename, original_filename, file_type, file_size, total_rows, valid_rows, invalid_rows, duplicate_rows, missing_value_rows, status
      ) VALUES (
        1, 'initial_inventory_sample.csv', 'inventory_master_2026.csv', 'text/csv', 2450000, 8, 8, 0, 0, 0, 'COMPLETED'
      )
    `);

    console.log('Seeding approval requests...');
    const [items] = await conn.query('SELECT id, sku, product_name, excess_quantity, excess_value FROM inventory_items WHERE excess_value > 50000');
    for (const item of items) {
      await conn.query(`
        INSERT INTO approval_requests (inventory_item_id, sku, reason, excess_quantity, excess_value, status)
        VALUES (?, ?, ?, ?, ?, 'PENDING')
      `, [item.id, item.sku, `Automated Excess Trigger: Reallocate capital or adjust production targets.`, item.excess_quantity, item.excess_value]);
    }

    console.log('Seeding blockchain logs...');
    await conn.query(`
      INSERT INTO blockchain_logs (record_id, sku, action, version, data_hash, verified) VALUES
      ('REC89201', 'SKU001', 'DATA_INGESTION', 1, '0x8f2a1b9487c02b9e11de9c4033af567b', TRUE),
      ('REC89202', 'SKU089', 'DATA_INGESTION', 1, '0x4f2c99a12bcde384910fa763b019e41c', TRUE),
      ('REC89203', 'SKU155', 'POLICY_TRIGGERED', 1, '0x77d12a9c4501ebfa9301da28734ef18a', TRUE)
    `);
  } else {
    console.log(`Database already contains ${existingItems[0].count} items.`);
  }

  console.log('Database seeding finished.');
  await conn.end();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
