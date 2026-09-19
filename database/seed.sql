USE chainslay_db;

-- Clear existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE blockchain_logs;
TRUNCATE TABLE approval_requests;
TRUNCATE TABLE uploads;
TRUNCATE TABLE inventory_items;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed inventory items
INSERT INTO inventory_items (sku, product_name, category, stock_quantity, target_stock, price_per_unit, inventory_value, abc_class, xyz_class, fsn_class, segment, status, excess_quantity, excess_value) VALUES
('SKU001', 'Electronic Motor', 'Electronics', 1000, 300, 500.00, 500000.00, 'A', 'X', 'F', 'A-X-F', 'EXCESS', 700, 350000.00),
('SKU042', 'Cooling Fan V2', 'Electronics', 450, 400, 250.00, 112500.00, 'B', 'Y', 'F', 'B-Y-F', 'EXCESS', 50, 12500.00),
('SKU089', 'Copper Wiring (10m)', 'Electrical', 2100, 500, 500.00, 1050000.00, 'A', 'Z', 'S', 'A-Z-S', 'EXCESS', 1600, 800000.00),
('SKU112', 'Steel Bracket', 'Hardware', 80, 100, 50.00, 4000.00, 'C', 'X', 'F', 'C-X-F', 'UNDERSTOCK', 0, 0.00),
('SKU155', 'Control Board', 'Electronics', 50, 20, 5000.00, 250000.00, 'A', 'X', 'S', 'A-X-S', 'EXCESS', 30, 150000.00);

-- Seed uploads history
INSERT INTO uploads (filename, original_filename, file_type, file_size, total_rows, valid_rows, invalid_rows, duplicate_rows, missing_value_rows, status) VALUES
('inventory_Q3_2026.csv', 'inventory_Q3_2026.csv', 'text/csv', 2400000, 1204, 1201, 3, 0, 3, 'COMPLETED');

-- Seed approval requests
INSERT INTO approval_requests (inventory_item_id, sku, reason, excess_quantity, excess_value, status) VALUES
(1, 'SKU001', 'Reduce excess inventory, review reorder policy.', 700, 350000.00, 'PENDING'),
(3, 'SKU089', 'Halt next shipment, renegotiate delivery date.', 1600, 800000.00, 'PENDING');

-- Seed blockchain logs
INSERT INTO blockchain_logs (record_id, sku, action, version, data_hash, verified) VALUES
('REC001', 'SKU001', 'DATA_INGESTION', 1, '0xabc1237f8e...9d2b', TRUE),
('REC014', 'SKU042', 'DATA_INGESTION', 1, '0x4f2c99a12b...e41c', TRUE),
('REC022', 'SKU112', 'DATA_INGESTION', 1, '0x77d12a9c45...f18a', TRUE);
