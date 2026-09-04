import pool from "../config/db.js";

const TABLE = "logs";

/** Creates the logs table if it doesn't exist yet. Safe to call on every startup. */
export async function ensureLogsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      userEmail VARCHAR(255),
      userRole VARCHAR(32),
      action VARCHAR(64),
      details TEXT,
      ip VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/** Appends one audit log entry. Never throws — logging failures shouldn't break the request. */
export async function addLog({ userEmail, userRole, action, details, ip }) {
  try {
    await pool.query(`INSERT INTO ${TABLE} (userEmail, userRole, action, details, ip) VALUES (?, ?, ?, ?, ?)`, [
      userEmail || "",
      userRole || "",
      action || "",
      details || "",
      ip || "",
    ]);
  } catch (err) {
    console.error("Failed to write audit log entry:", err.message);
  }
}

/** Returns log entries, most recent first, optionally capped to `limit` (legacy — kept for any other callers). */
export async function getLogs({ limit } = {}) {
  const lim = limit ? parseInt(limit, 10) : 500;
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} ORDER BY timestamp DESC, id DESC LIMIT ?`, [lim]);
  return rows.map((r) => ({
    ...r,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
  }));
}

/**
 * Server-side paginated + searchable audit log — the log table has no
 * natural upper bound (it grows with every action, forever), so this is
 * the one list in the app where client-side "fetch everything and slice"
 * was never going to hold up.
 */
export async function getLogsPaged({ page = 1, pageSize = 20, search = "" } = {}) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const searchClause = search ? `WHERE userEmail LIKE ? OR action LIKE ? OR details LIKE ?` : "";
  const searchParams = search ? Array(3).fill(`%${search}%`) : [];

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${TABLE} ${searchClause}`, searchParams);
  const [rows] = await pool.query(
    `SELECT * FROM ${TABLE} ${searchClause} ORDER BY timestamp DESC, id DESC LIMIT ? OFFSET ?`,
    [...searchParams, safePageSize, offset]
  );

  return {
    items: rows.map((r) => ({ ...r, timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp })),
    total,
    page: safePage,
    pageSize: safePageSize,
  };
}
