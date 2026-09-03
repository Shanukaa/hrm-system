import pool from "../config/db.js";

const TABLE = "departments";

export async function ensureDepartmentsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      managerEmpNo VARCHAR(64) NULL,
      maxConcurrentLeaves INT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function normalize(row) {
  if (!row) return null;
  return { ...row, maxConcurrentLeaves: row.maxConcurrentLeaves === null ? null : Number(row.maxConcurrentLeaves) };
}

/** Departments joined with headcount + manager's name (via employee_leave_profile -> employees). */
export async function getAllDepartments() {
  const [rows] = await pool.query(`
    SELECT d.*,
      e.employeeName AS managerName,
      (SELECT COUNT(*) FROM employee_leave_profile p WHERE p.departmentId = d.id) AS employeeCount
    FROM ${TABLE} d
    LEFT JOIN employees e ON e.empNo = d.managerEmpNo
    ORDER BY d.name ASC
  `);
  return rows.map(normalize);
}

export async function getDepartmentById(id) {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
  return normalize(rows[0]);
}

export async function createDepartment({ name, managerEmpNo, maxConcurrentLeaves }) {
  if (!name?.trim()) {
    const err = new Error("Department name is required");
    err.status = 400;
    throw err;
  }
  const [result] = await pool.query(
    `INSERT INTO ${TABLE} (name, managerEmpNo, maxConcurrentLeaves) VALUES (?, ?, ?)`,
    [name.trim(), managerEmpNo || null, maxConcurrentLeaves === undefined || maxConcurrentLeaves === "" ? null : Number(maxConcurrentLeaves)]
  );
  return getDepartmentById(result.insertId);
}

export async function updateDepartment(id, { name, managerEmpNo, maxConcurrentLeaves }) {
  const existing = await getDepartmentById(id);
  if (!existing) {
    const err = new Error("Department not found");
    err.status = 404;
    throw err;
  }
  const merged = {
    name: name !== undefined ? name.trim() : existing.name,
    managerEmpNo: managerEmpNo !== undefined ? managerEmpNo || null : existing.managerEmpNo,
    maxConcurrentLeaves:
      maxConcurrentLeaves !== undefined
        ? maxConcurrentLeaves === "" || maxConcurrentLeaves === null
          ? null
          : Number(maxConcurrentLeaves)
        : existing.maxConcurrentLeaves,
  };
  await pool.query(`UPDATE ${TABLE} SET name = ?, managerEmpNo = ?, maxConcurrentLeaves = ? WHERE id = ?`, [
    merged.name,
    merged.managerEmpNo,
    merged.maxConcurrentLeaves,
    id,
  ]);
  return getDepartmentById(id);
}

export async function deleteDepartment(id) {
  await pool.query(`UPDATE employee_leave_profile SET departmentId = NULL WHERE departmentId = ?`, [id]);
  await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
}

/** The department a manager (by empNo) manages, if any. */
export async function getDepartmentManagedBy(managerEmpNo) {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE managerEmpNo = ? LIMIT 1`, [managerEmpNo]);
  return normalize(rows[0]);
}

/** Clears managerEmpNo on any department that pointed at this employee — used when the employee record is deleted. */
export async function unassignManagerEverywhere(empNo) {
  await pool.query(`UPDATE ${TABLE} SET managerEmpNo = NULL WHERE managerEmpNo = ?`, [empNo]);
}

/** All employees (name + empNo) currently assigned to a department. */
export async function getEmployeesInDepartment(departmentId) {
  const [rows] = await pool.query(
    `SELECT e.empNo, e.employeeName, e.designation FROM employee_leave_profile p
     JOIN employees e ON e.empNo = p.empNo
     WHERE p.departmentId = ?
     ORDER BY e.employeeName ASC`,
    [departmentId]
  );
  return rows;
}
