import pool from "../config/db.js";

const TABLE = "announcements";

export async function ensureAnnouncementsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      scope VARCHAR(16) NOT NULL DEFAULT 'global',
      departmentId INT NULL,
      createdBy VARCHAR(255) NOT NULL,
      createdByName VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (scope),
      INDEX (departmentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function normalize(row) {
  if (!row) return null;
  return { ...row, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt };
}

export async function createAnnouncement({ title, body, scope, departmentId, createdBy, createdByName }) {
  if (!title?.trim()) {
    const err = new Error("Announcement title is required");
    err.status = 400;
    throw err;
  }
  if (scope === "department" && !departmentId) {
    const err = new Error("departmentId is required for a department announcement");
    err.status = 400;
    throw err;
  }
  const [result] = await pool.query(
    `INSERT INTO ${TABLE} (title, body, scope, departmentId, createdBy, createdByName) VALUES (?, ?, ?, ?, ?, ?)`,
    [title.trim(), body || "", scope, scope === "department" ? departmentId : null, createdBy, createdByName]
  );
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ?`, [result.insertId]);
  return normalize(rows[0]);
}

/** Announcements visible to a viewer: all global ones, plus their own department's (if any). */
export async function getVisibleAnnouncements(departmentId) {
  const [rows] = await pool.query(
    `SELECT * FROM ${TABLE} WHERE scope = 'global' ${departmentId ? "OR (scope = 'department' AND departmentId = ?)" : ""}
     ORDER BY createdAt DESC LIMIT 50`,
    departmentId ? [departmentId] : []
  );
  return rows.map(normalize);
}

export async function getAnnouncementById(id) {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
  return normalize(rows[0]);
}

export async function deleteAnnouncement(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
}
