import { pool } from "./database";

export async function autoInitDatabase() {
  try {
    console.log("[DB Init] Checking and auto-initializing database tables...");

    // 1. Workspaces
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Ensure default workspace 1
    await pool.query(`
      INSERT IGNORE INTO workspaces (id, name) VALUES (1, 'Default Workspace')
    `);

    // 2. Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3. Workspace Members
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id INT PRIMARY KEY AUTO_INCREMENT,
        workspace_id INT NOT NULL,
        user_id INT NOT NULL,
        role VARCHAR(50) DEFAULT 'MEMBER',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(workspace_id, user_id)
      )
    `);

    // 4. Upload Batches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS upload_batches (
        id INT PRIMARY KEY AUTO_INCREMENT,
        workspace_id INT NOT NULL,
        filename VARCHAR(255),
        original_filename VARCHAR(255),
        file_type VARCHAR(255),
        file_size BIGINT,
        total_rows INT DEFAULT 0,
        valid_rows INT DEFAULT 0,
        invalid_rows INT DEFAULT 0,
        duplicate_rows INT DEFAULT 0,
        missing_value_rows INT DEFAULT 0,
        status VARCHAR(30),
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);

    // 5. Inventory Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        workspace_id INT NOT NULL,
        upload_batch_id INT,
        sku VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        category VARCHAR(150),
        location VARCHAR(150),
        supplier_name VARCHAR(255),
        abc_class VARCHAR(10),
        xyz_class VARCHAR(10),
        fsn_class VARCHAR(10),
        segment VARCHAR(30) DEFAULT 'A-X-F',
        status VARCHAR(30) DEFAULT 'OPTIMIZED',
        target_stock INT NOT NULL DEFAULT 0,
        stock_quantity INT NOT NULL DEFAULT 0,
        unit_cost DECIMAL(12,2) DEFAULT 0,
        inventory_value DECIMAL(15,2) DEFAULT 0,
        demand_quantity INT DEFAULT 0,
        reorder_level INT DEFAULT 0,
        target_coverage_months INT DEFAULT 0,
        excess_quantity INT DEFAULT 0,
        excess_value DECIMAL(15,2) DEFAULT 0,
        last_sold_at TIMESTAMP NULL,
        record_status VARCHAR(30) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        UNIQUE(workspace_id, sku)
      )
    `);

    // 6. Inventory Snapshots
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_snapshots (
        id INT PRIMARY KEY AUTO_INCREMENT,
        workspace_id INT NOT NULL,
        inventory_item_id INT NOT NULL,
        sku VARCHAR(100) NOT NULL,
        stock_quantity INT NOT NULL,
        inventory_value DECIMAL(15,2),
        snapshot_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
      )
    `);

    // 7. Forecasts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forecasts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        workspace_id INT NOT NULL,
        inventory_item_id INT NOT NULL,
        forecast_period VARCHAR(50),
        predicted_demand INT,
        confidence_score DECIMAL(5,2),
        model_name VARCHAR(100) NULL,
        model_version VARCHAR(50) NULL,
        safety_stock INT NULL,
        reorder_point INT NULL,
        recommended_quantity INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
      )
    `);

    // 8. Recommendations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        workspace_id INT NOT NULL,
        inventory_item_id INT NOT NULL,
        recommendation_type VARCHAR(100),
        description TEXT,
        impact_value DECIMAL(15,2),
        confidence_score DECIMAL(5,2),
        status VARCHAR(30) DEFAULT 'PENDING',
        model_name VARCHAR(100) NULL,
        model_version VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
      )
    `);

    // 9. Approvals
    await pool.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id INT PRIMARY KEY AUTO_INCREMENT,
        workspace_id INT NOT NULL,
        recommendation_id INT,
        inventory_item_id INT,
        action_type VARCHAR(100),
        status VARCHAR(30) DEFAULT 'PENDING',
        approved_by INT,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);

    // 10. Approval Requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        inventory_item_id INT,
        sku VARCHAR(100),
        product_name VARCHAR(255),
        reason TEXT,
        excess_quantity INT,
        excess_value DECIMAL(15,2),
        status VARCHAR(30) DEFAULT 'PENDING',
        approved_by VARCHAR(150),
        approved_at TIMESTAMP NULL,
        recommendation_id INT NULL,
        ml_confidence DECIMAL(5,2) NULL,
        ml_suggested_action VARCHAR(255) NULL,
        ml_model_version VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
      )
    `);

    // 11. Blockchain Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blockchain_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        record_id VARCHAR(100),
        sku VARCHAR(100),
        product_name VARCHAR(255),
        action VARCHAR(100),
        version INT DEFAULT 1,
        data_hash VARCHAR(255),
        verified BOOLEAN DEFAULT TRUE,
        tx_hash VARCHAR(255) NULL,
        block_number BIGINT NULL,
        network_id VARCHAR(50) DEFAULT 'LOCAL_SIMULATION',
        verification_mode VARCHAR(50) DEFAULT 'CRYPTOGRAPHIC_SIMULATION',
        tx_status VARCHAR(30) DEFAULT 'LOCAL_ONLY',
        error_log TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Ledger Events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ledger_events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        workspace_id INT NOT NULL,
        record_type VARCHAR(50),
        record_id INT,
        action VARCHAR(100),
        data_hash VARCHAR(255),
        verified BOOLEAN DEFAULT TRUE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);

    // Seed sample data if inventory_items is empty
    const [rows]: any = await pool.query("SELECT COUNT(*) as count FROM inventory_items WHERE workspace_id = 1");
    if (rows && rows[0] && rows[0].count === 0) {
      console.log("[DB Init] Seeding baseline inventory items for new database...");
      await pool.query(`
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

      await pool.query(`
        INSERT INTO upload_batches (
          workspace_id, filename, original_filename, file_type, file_size, total_rows, valid_rows, invalid_rows, duplicate_rows, missing_value_rows, status
        ) VALUES (
          1, 'initial_inventory_sample.csv', 'inventory_master_2026.csv', 'text/csv', 2450000, 8, 8, 0, 0, 0, 'COMPLETED'
        )
      `);

      await pool.query(`
        INSERT INTO blockchain_logs (record_id, sku, action, version, data_hash, verified) VALUES
        ('REC89201', 'SKU001', 'DATA_INGESTION', 1, '0x8f2a1b9487c02b9e11de9c4033af567b', TRUE),
        ('REC89202', 'SKU089', 'DATA_INGESTION', 1, '0x4f2c99a12bcde384910fa763b019e41c', TRUE),
        ('REC89203', 'SKU155', 'POLICY_TRIGGERED', 1, '0x77d12a9c4501ebfa9301da28734ef18a', TRUE)
      `);
    }

    console.log("[DB Init] Database tables and schemas verified successfully.");
  } catch (error) {
    console.error("[DB Init] Automatic schema migration error:", error);
  }
}
