import pool from "../config/db.js";

const TABLE = "schema_migrations";

/**
 * A minimal, dependency-free migration runner. Each migration has a fixed
 * id and a function that mutates the schema; once an id has run
 * successfully it's recorded here and never runs again, even across
 * restarts or redeploys. This exists alongside (not instead of) the
 * existing per-table `ensureXTable()` functions, which handle initial table
 * creation and are safe to re-run by design (CREATE TABLE IF NOT EXISTS,
 * ALTER ... wrapped in try/catch for ER_DUP_FIELDNAME). Migrations are for
 * changes that aren't naturally idempotent — like adding an index, which
 * MySQL has no "IF NOT EXISTS" shorthand for — so we track them explicitly
 * instead of relying on try/catch-and-ignore.
 *
 * New migrations always go at the end of the MIGRATIONS list below, never
 * edited or reordered after being deployed anywhere.
 */
export async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id VARCHAR(128) NOT NULL PRIMARY KEY,
      appliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function hasRun(id) {
  const [rows] = await pool.query(`SELECT id FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
  return rows.length > 0;
}

async function markRun(id) {
  await pool.query(`INSERT INTO ${TABLE} (id) VALUES (?)`, [id]);
}

/** Adds an index, silently skipping if one with that name already exists (MySQL has no ADD INDEX IF NOT EXISTS). */
async function addIndexIfMissing(table, indexName, columns) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1`,
    [table, indexName]
  );
  if (rows.length > 0) return;
  await pool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns})`);
}

const MIGRATIONS = [
  {
    id: "2026_09_add_pagination_indexes",
    up: async () => {
      // These back the search/pagination queries added when the employee,
      // log, and leave-request lists moved from "fetch everything, slice
      // in the browser" to real server-side LIMIT/OFFSET pagination —
      // without them, every page of results still does a full table scan.
      await addIndexIfMissing("employees", "idx_employees_name", "`employeeName`");
      await addIndexIfMissing("logs", "idx_logs_timestamp", "`timestamp`");
      await addIndexIfMissing("logs", "idx_logs_user_email", "`userEmail`");
      await addIndexIfMissing("leave_requests", "idx_leave_requests_status_requested", "`status`, `requestedAt`");
    },
  },
];

/** Runs any migrations that haven't been applied to this database yet, in order. */
export async function runMigrations() {
  await ensureMigrationsTable();
  for (const migration of MIGRATIONS) {
    if (await hasRun(migration.id)) continue;
    await migration.up();
    await markRun(migration.id);
    console.log(`Applied migration: ${migration.id}`);
  }
}
