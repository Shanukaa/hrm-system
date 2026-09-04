import pool from "../config/db.js";

const TABLE = "public_holidays";

export async function ensurePublicHolidaysTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date DATE NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      createdBy VARCHAR(255),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function normalize(row) {
  if (!row) return null;
  return { ...row, date: row.date ? new Date(row.date).toISOString().slice(0, 10) : null };
}

export async function getAllHolidays() {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} ORDER BY date ASC`);
  return rows.map(normalize);
}

/** A Set of ISO date strings ("YYYY-MM-DD") for every holiday within [start, end] inclusive. */
export async function getHolidayDatesInRange(start, end) {
  const [rows] = await pool.query(`SELECT date FROM ${TABLE} WHERE date BETWEEN ? AND ?`, [start, end]);
  return new Set(rows.map((r) => new Date(r.date).toISOString().slice(0, 10)));
}

export async function createHoliday({ date, name }, createdBy) {
  if (!date || !name?.trim()) {
    const err = new Error("date and name are both required");
    err.status = 400;
    throw err;
  }
  try {
    const [result] = await pool.query(`INSERT INTO ${TABLE} (date, name, createdBy) VALUES (?, ?, ?)`, [date, name.trim(), createdBy]);
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ?`, [result.insertId]);
    return normalize(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const dupErr = new Error(`A holiday is already recorded for ${date}`);
      dupErr.status = 409;
      throw dupErr;
    }
    throw err;
  }
}

export async function deleteHoliday(id) {
  const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  if (result.affectedRows === 0) {
    const err = new Error("Holiday not found");
    err.status = 404;
    throw err;
  }
}
