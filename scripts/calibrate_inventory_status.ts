import { pool } from "../server/config/database";

export async function calibrateInventoryStatuses() {
  console.log("Starting Inventory Status Calibration...");

  // 1. Fix target_stock invariant where target_stock < reorder_level
  const [fixedTargets]: any = await pool.query(`
    UPDATE inventory_items 
    SET target_stock = ROUND(reorder_level * 1.5)
    WHERE reorder_level > 0 AND target_stock < reorder_level
  `);
  console.log(`Updated ${fixedTargets.affectedRows} items with target_stock < reorder_level.`);

  // 2. Calibrate items where stock_quantity < reorder_level to UNDERSTOCK
  const [understockUpdated]: any = await pool.query(`
    UPDATE inventory_items 
    SET status = 'UNDERSTOCK', excess_quantity = 0, excess_value = 0
    WHERE reorder_level > 0 AND stock_quantity < reorder_level
  `);
  console.log(`Calibrated ${understockUpdated.affectedRows} items to UNDERSTOCK.`);

  // 3. Calibrate any non-standard statuses (e.g. 'Active', 'Discontinued', 'Backordered')
  const [excessCleaned]: any = await pool.query(`
    UPDATE inventory_items 
    SET status = 'EXCESS',
        excess_quantity = GREATEST(0, stock_quantity - target_stock),
        excess_value = ROUND(GREATEST(0, stock_quantity - target_stock) * unit_cost, 2)
    WHERE status NOT IN ('EXCESS', 'UNDERSTOCK', 'OPTIMIZED')
      AND stock_quantity > target_stock
  `);
  console.log(`Calibrated ${excessCleaned.affectedRows} items to EXCESS.`);

  const [optimizedCleaned]: any = await pool.query(`
    UPDATE inventory_items 
    SET status = 'OPTIMIZED', excess_quantity = 0, excess_value = 0
    WHERE status NOT IN ('EXCESS', 'UNDERSTOCK', 'OPTIMIZED')
  `);
  console.log(`Calibrated ${optimizedCleaned.affectedRows} items to OPTIMIZED.`);

  // 4. Ensure sample pending approval requests for both Excess and Understock exist
  const [[pendingCount]]: any = await pool.query(
    "SELECT COUNT(*) as count FROM approval_requests WHERE status = 'PENDING'"
  );

  if (pendingCount.count < 5) {
    console.log("Seeding pending approval requests for Manager Review...");

    // Seed top excess
    const [topExcess]: any = await pool.query(`
      SELECT id, sku, product_name, excess_quantity, excess_value 
      FROM inventory_items 
      WHERE status = 'EXCESS' AND excess_value > 10000 
        AND id NOT IN (SELECT COALESCE(inventory_item_id, 0) FROM approval_requests)
      ORDER BY excess_value DESC 
      LIMIT 3
    `);

    for (const item of topExcess) {
      await pool.query(`
        INSERT INTO approval_requests (inventory_item_id, sku, reason, excess_quantity, excess_value, status)
        VALUES (?, ?, ?, ?, ?, 'PENDING')
      `, [
        item.id,
        item.sku,
        `Reallocate excess capital: ${item.excess_quantity} units above target (${item.product_name})`,
        item.excess_quantity,
        item.excess_value
      ]);
    }

    // Seed top understock
    const [topUnderstock]: any = await pool.query(`
      SELECT id, sku, product_name, stock_quantity, reorder_level, target_stock, unit_cost 
      FROM inventory_items 
      WHERE status = 'UNDERSTOCK' 
        AND id NOT IN (SELECT COALESCE(inventory_item_id, 0) FROM approval_requests)
      ORDER BY (reorder_level - stock_quantity) DESC 
      LIMIT 3
    `);

    for (const item of topUnderstock) {
      const deficit = Math.max(1, (item.target_stock || item.reorder_level * 2) - item.stock_quantity);
      const estCost = Number((deficit * item.unit_cost).toFixed(2));
      await pool.query(`
        INSERT INTO approval_requests (inventory_item_id, sku, reason, excess_quantity, excess_value, status)
        VALUES (?, ?, ?, ?, ?, 'PENDING')
      `, [
        item.id,
        item.sku,
        `Urgent stock reorder: ${deficit} units needed to reach target stock (${item.product_name})`,
        -deficit,
        estCost
      ]);
    }
  }

  const [statusSummary]: any = await pool.query(`
    SELECT status, COUNT(*) as count, SUM(excess_value) as excess_val 
    FROM inventory_items 
    GROUP BY status
  `);
  console.log("Calibration complete. Status summary:", statusSummary);

  const [approvalSummary]: any = await pool.query(`
    SELECT status, COUNT(*) as count 
    FROM approval_requests 
    GROUP BY status
  `);
  console.log("Approval requests summary:", approvalSummary);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  calibrateInventoryStatuses()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Calibration error:", err);
      process.exit(1);
    });
}
