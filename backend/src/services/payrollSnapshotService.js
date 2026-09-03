import pool from "../config/db.js";

const TABLE = "payroll_snapshots";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function ensurePayrollSnapshotsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      empNo VARCHAR(64) NOT NULL,
      periodYear INT NOT NULL,
      periodMonth INT NOT NULL,
      periodLabel VARCHAR(64) NOT NULL,
      employeeData JSON NOT NULL,
      generatedBy VARCHAR(255),
      generatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_period (empNo, periodYear, periodMonth)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/**
 * Parses a "Month YYYY" label (what the frontend's calendar-style
 * MonthYearPicker always sends) into { year, month }. Defaults to the
 * current month/year if no period is given at all.
 */
export function parsePeriodLabel(label) {
  if (!label) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}` };
  }
  const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(String(label).trim());
  if (!match) {
    const err = new Error(`Pay period must be in "Month YYYY" format (got "${label}")`);
    err.status = 400;
    throw err;
  }
  const monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === match[1].toLowerCase());
  if (monthIndex === -1) {
    const err = new Error(`"${match[1]}" isn't a recognized month name`);
    err.status = 400;
    throw err;
  }
  return { year: Number(match[2]), month: monthIndex + 1, label: `${MONTH_NAMES[monthIndex]} ${match[2]}` };
}

export async function getSnapshot(empNo, year, month) {
  const [rows] = await pool.query(
    `SELECT * FROM ${TABLE} WHERE empNo = ? AND periodYear = ? AND periodMonth = ? LIMIT 1`,
    [empNo, year, month]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  // mysql2 already parses JSON columns into JS values, but guard against a
  // driver/config that returns it as a string.
  const employeeData = typeof row.employeeData === "string" ? JSON.parse(row.employeeData) : row.employeeData;
  return { ...row, employeeData };
}

export async function createSnapshot({ empNo, year, month, label, employeeData, generatedBy }) {
  await pool.query(
    `INSERT INTO ${TABLE} (empNo, periodYear, periodMonth, periodLabel, employeeData, generatedBy)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`, // No-op on a race between two simultaneous first-time requests — first writer wins, which is what we want.
    [empNo, year, month, label, JSON.stringify(employeeData), generatedBy]
  );
  return getSnapshot(empNo, year, month);
}

/**
 * Fetches the locked snapshot for empNo/period if one exists; otherwise
 * creates one from the employee data provided (the caller's live record),
 * locking that data in as the permanent record for this pay period.
 * Every subsequent payslip download for this period — regardless of any
 * later salary changes — returns exactly what was first generated.
 */
export async function getOrCreateSnapshot({ empNo, periodInput, liveEmployeeData, generatedBy }) {
  const { year, month, label } = parsePeriodLabel(periodInput);
  const existing = await getSnapshot(empNo, year, month);
  if (existing) return { snapshot: existing, isNew: false };
  const snapshot = await createSnapshot({ empNo, year, month, label, employeeData: liveEmployeeData, generatedBy });
  return { snapshot, isNew: true };
}

/** Admin/HR-manager correction path: clears a locked snapshot so the next download re-locks fresh data. */
export async function deleteSnapshot(empNo, periodInput) {
  const { year, month } = parsePeriodLabel(periodInput);
  await pool.query(`DELETE FROM ${TABLE} WHERE empNo = ? AND periodYear = ? AND periodMonth = ?`, [empNo, year, month]);
}
