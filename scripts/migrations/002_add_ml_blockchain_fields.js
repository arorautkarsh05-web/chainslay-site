import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export async function runMigration() {
  const dbName = process.env.DB_NAME || "chainslay_db";
  console.log(`Starting Phase 1 migration on database: ${dbName}...`);

  const isRemote = Boolean(process.env.DB_HOST && !process.env.DB_HOST.includes("127.0.0.1") && !process.env.DB_HOST.includes("localhost"));
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: dbName,
    ssl: process.env.DB_SSL === "true" || isRemote ? { minVersion: "TLSv1.2", rejectUnauthorized: false } : undefined,
  });

  console.log("Connected to MySQL. Performing pre-migration checks...");

  // Pre-migration schema check
  const requiredTables = [
    "forecasts",
    "recommendations",
    "approval_requests",
    "blockchain_logs",
  ];
  for (const table of requiredTables) {
    const [rows] = await conn.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
      [dbName, table]
    );
    if (rows.length === 0) {
      throw new Error(
        `Pre-migration check failed: Table ${table} does not exist in ${dbName}`
      );
    }
  }
  console.log("All required tables verified. Applying additive columns...");

  const checkAndAddColumn = async (table, column, colDef) => {
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [dbName, table, column]
    );
    if (cols.length === 0) {
      console.log(`  [ADD] Adding column ${column} to table ${table}...`);
      await conn.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${colDef}`
      );
    } else {
      console.log(
        `  [SKIP] Column ${column} already exists on table ${table}.`
      );
    }
  };

  // 1. Additive columns for approval_requests
  await checkAndAddColumn("approval_requests", "recommendation_id", "INT NULL");
  await checkAndAddColumn(
    "approval_requests",
    "ml_confidence",
    "DECIMAL(5,2) NULL"
  );
  await checkAndAddColumn(
    "approval_requests",
    "ml_suggested_action",
    "VARCHAR(255) NULL"
  );
  await checkAndAddColumn(
    "approval_requests",
    "ml_model_version",
    "VARCHAR(50) NULL"
  );

  // 2. Additive columns for blockchain_logs
  await checkAndAddColumn("blockchain_logs", "tx_hash", "VARCHAR(255) NULL");
  await checkAndAddColumn("blockchain_logs", "block_number", "BIGINT NULL");
  await checkAndAddColumn(
    "blockchain_logs",
    "network_id",
    "VARCHAR(50) DEFAULT 'LOCAL_SIMULATION'"
  );
  await checkAndAddColumn(
    "blockchain_logs",
    "verification_mode",
    "VARCHAR(50) DEFAULT 'CRYPTOGRAPHIC_SIMULATION'"
  );
  await checkAndAddColumn(
    "blockchain_logs",
    "tx_status",
    "VARCHAR(30) DEFAULT 'LOCAL_ONLY'"
  );
  await checkAndAddColumn("blockchain_logs", "error_log", "TEXT NULL");

  // 3. Additive columns for forecasts
  await checkAndAddColumn("forecasts", "model_name", "VARCHAR(100) NULL");
  await checkAndAddColumn("forecasts", "model_version", "VARCHAR(50) NULL");

  // 4. Additive columns for recommendations
  await checkAndAddColumn("recommendations", "safety_stock", "INT NULL");
  await checkAndAddColumn("recommendations", "reorder_point", "INT NULL");
  await checkAndAddColumn(
    "recommendations",
    "recommended_quantity",
    "INT NULL"
  );
  await checkAndAddColumn(
    "recommendations",
    "model_version",
    "VARCHAR(50) NULL"
  );

  console.log("Running post-migration compatibility verification...");

  // Post-migration read test
  for (const table of requiredTables) {
    const [sample] = await conn.query(`SELECT * FROM \`${table}\` LIMIT 1`);
    console.log(
      `  Read test passed on ${table} (${sample.length} rows sampled).`
    );
  }

  // Backward compatibility write test on blockchain_logs using legacy insert shape
  const testRecordId = `TEST_COMPAT_${Date.now()}`;
  await conn.query(
    "INSERT INTO blockchain_logs (record_id, sku, action, data_hash, verified) VALUES (?, ?, ?, ?, ?)",
    [testRecordId, "TEST-SKU", "COMPAT_TEST", "0x1234567890abcdef", true]
  );

  const [testRow] = await conn.query(
    "SELECT * FROM blockchain_logs WHERE record_id = ?",
    [testRecordId]
  );
  const row = testRow[0];
  if (
    !row ||
    row.verification_mode !== "CRYPTOGRAPHIC_SIMULATION" ||
    row.network_id !== "LOCAL_SIMULATION" ||
    row.tx_status !== "LOCAL_ONLY"
  ) {
    throw new Error(
      "Post-migration test failed: Default values for additive columns were not applied correctly."
    );
  }

  // Clean up test row
  await conn.query("DELETE FROM blockchain_logs WHERE record_id = ?", [
    testRecordId,
  ]);
  console.log(
    "  Backward compatibility insert & default value verification passed."
  );

  await conn.end();
  console.log(
    "Migration 002 completed successfully with 100% backward compatibility."
  );
}

if (
  process.argv[1] &&
  process.argv[1].includes("002_add_ml_blockchain_fields")
) {
  runMigration().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
