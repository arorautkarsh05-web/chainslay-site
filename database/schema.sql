CREATE DATABASE IF NOT EXISTS chainslay_db;
USE chainslay_db;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(50) DEFAULT 'MEMBER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(workspace_id, user_id)
);

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
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

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
  FOREIGN KEY (upload_batch_id) REFERENCES upload_batches(id) ON DELETE SET NULL,
  UNIQUE(workspace_id, sku)
);

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
);

CREATE TABLE IF NOT EXISTS forecasts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT NOT NULL,
  inventory_item_id INT NOT NULL,
  forecast_period VARCHAR(50),
  predicted_demand INT,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT NOT NULL,
  inventory_item_id INT NOT NULL,
  recommendation_type VARCHAR(100),
  description TEXT,
  impact_value DECIMAL(15,2),
  confidence_score DECIMAL(5,2),
  status VARCHAR(30) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

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
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

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
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blockchain_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  record_id VARCHAR(100),
  sku VARCHAR(100),
  product_name VARCHAR(255),
  action VARCHAR(100),
  version INT DEFAULT 1,
  data_hash VARCHAR(255),
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_workspace ON inventory_items(workspace_id);
CREATE INDEX idx_recommendation_status ON recommendations(status);
CREATE INDEX idx_approval_status ON approvals(status);
