import pool from "../config/db.js";
import { COLUMNS } from "../config/columns.js";

const TABLE = "employees";
const KEYS = COLUMNS.map((c) => c.key);
const NON_ID_KEYS = KEYS.filter((k) => k !== "empNo");

function sqlType(col) {
  if (col.key === "empNo") return "VARCHAR(64)";
  if (col.type === "number") return "DECIMAL(14,2) NOT NULL DEFAULT 0";
  return "VARCHAR(255)";
}

/** Creates the employees table if it doesn't exist yet. Safe to call on every startup. */
export async function ensureEmployeesTable() {
  const columnDefs = COLUMNS.map((c) => `\`${c.key}\` ${sqlType(c)}`).join(",\n      ");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      ${columnDefs},
      PRIMARY KEY (\`empNo\`),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function normalizeRow(row) {
  const out = {};
  KEYS.forEach((k) => {
    const col = COLUMNS.find((c) => c.key === k);
    out[k] = col.type === "number" ? Number(row[k] ?? 0) : row[k] ?? "";
  });
  return out;
}

/** Fetches all employee rows as objects, keyed by field name. */
export async function getAllEmployees() {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} ORDER BY empNo`);
  return rows.map(normalizeRow);
}

export async function getEmployeeByEmpNo(empNo) {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE \`empNo\` = ? LIMIT 1`, [empNo]);
  return rows[0] ? normalizeRow(rows[0]) : null;
}

/** Inserts a new employee row. Throws if EMP NO already exists. */
export async function createEmployee(data) {
  const existing = await getEmployeeByEmpNo(data.empNo);
  if (existing) {
    const err = new Error(`Employee with EMP NO "${data.empNo}" already exists`);
    err.status = 409;
    throw err;
  }
  const columns = KEYS.map((k) => `\`${k}\``).join(", ");
  const placeholders = KEYS.map(() => "?").join(", ");
  const values = KEYS.map((k) => data[k] ?? (COLUMNS.find((c) => c.key === k).type === "number" ? 0 : ""));
  await pool.query(`INSERT INTO ${TABLE} (${columns}) VALUES (${placeholders})`, values);
  return normalizeRow(data);
}

/** Updates an existing employee row (matched by EMP NO). */
export async function updateEmployee(empNo, data) {
  const existing = await getEmployeeByEmpNo(empNo);
  if (!existing) {
    const err = new Error(`Employee with EMP NO "${empNo}" not found`);
    err.status = 404;
    throw err;
  }
  const merged = { ...existing, ...data, empNo };
  const setClause = NON_ID_KEYS.map((k) => `\`${k}\` = ?`).join(", ");
  const values = NON_ID_KEYS.map((k) => merged[k] ?? (COLUMNS.find((c) => c.key === k).type === "number" ? 0 : ""));
  await pool.query(`UPDATE ${TABLE} SET ${setClause} WHERE \`empNo\` = ?`, [...values, empNo]);
  return normalizeRow(merged);
}

/** Deletes an employee row (matched by EMP NO). */
export async function deleteEmployee(empNo) {
  const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE \`empNo\` = ?`, [empNo]);
  if (result.affectedRows === 0) {
    const err = new Error(`Employee with EMP NO "${empNo}" not found`);
    err.status = 404;
    throw err;
  }
}

/** Bulk upsert used by the CSV/Excel import flow. Creates new rows or updates existing ones by EMP NO. */
export async function upsertEmployees(records) {
  let created = 0;
  let updated = 0;
  for (const record of records) {
    const existing = await getEmployeeByEmpNo(record.empNo);
    if (existing) {
      await updateEmployee(record.empNo, record);
      updated++;
    } else {
      await createEmployee(record);
      created++;
    }
  }
  return { created, updated };
}
