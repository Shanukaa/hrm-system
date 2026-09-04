import pool from "../config/db.js";
import { getHolidayDatesInRange } from "./holidayService.js";

const PROFILE_TABLE = "employee_leave_profile";
const REQUEST_TABLE = "leave_requests";

/**
 * ---------------------------------------------------------------------
 * LEAVE POLICY (single source of truth — tweak these numbers to change
 * the whole system's behaviour):
 *
 *   1. Probation employee                         -> 4 leaves / calendar month
 *   2. Permanent employee, < 365 days since join   -> 4 leaves / calendar month
 *   3. Permanent employee, >= 365 days since join  -> 6 leaves / calendar month
 *      ...until HR/Admin enters an annual leave allocation for them (see
 *      employee_leave_profile.annualLeaveSet), at which point they switch
 *      to an annual pool (default 14 days/year, editable per employee) that
 *      renews every year on their join-date anniversary.
 *
 * Days beyond what's available are not blocked — the request can still be
 * submitted/approved, but any days past the remaining balance are marked
 * "no pay" (noPayDays) instead of paid (paidDays).
 * ---------------------------------------------------------------------
 */
export const LEAVE_POLICY = {
  probationMonthly: 4,
  permanentUnderYearMonthly: 4,
  permanentOverYearMonthly: 6,
  defaultAnnualLeaveDays: 14,
  qualifyingDays: 365, // days of continuous employment before the "over a year" rules apply
};

const POLICY_TABLE = "leave_policy_settings";
const POLICY_FIELDS = ["probationMonthly", "permanentUnderYearMonthly", "permanentOverYearMonthly", "defaultAnnualLeaveDays", "qualifyingDays"];

// In-memory cache of the admin-configured policy, so the hot path
// (computing every employee's balance) doesn't hit the database on every
// call just to read five numbers that change maybe once a year. Invalidated
// whenever an admin actually changes the settings.
let policyCache = null;

export async function ensureLeavePolicyTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${POLICY_TABLE} (
      id INT PRIMARY KEY DEFAULT 1,
      probationMonthly DECIMAL(5,1) NOT NULL,
      permanentUnderYearMonthly DECIMAL(5,1) NOT NULL,
      permanentOverYearMonthly DECIMAL(5,1) NOT NULL,
      defaultAnnualLeaveDays DECIMAL(5,1) NOT NULL,
      qualifyingDays INT NOT NULL,
      updatedBy VARCHAR(255),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT single_row CHECK (id = 1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // Seed the one row with the built-in defaults, but only the first time —
  // never overwrite an admin's actual configured values on a later restart.
  await pool.query(
    `INSERT IGNORE INTO ${POLICY_TABLE} (id, probationMonthly, permanentUnderYearMonthly, permanentOverYearMonthly, defaultAnnualLeaveDays, qualifyingDays)
     VALUES (1, ?, ?, ?, ?, ?)`,
    [LEAVE_POLICY.probationMonthly, LEAVE_POLICY.permanentUnderYearMonthly, LEAVE_POLICY.permanentOverYearMonthly, LEAVE_POLICY.defaultAnnualLeaveDays, LEAVE_POLICY.qualifyingDays]
  );
}

/** The policy actually in effect right now — the admin-configured values if any exist, otherwise the built-in defaults. */
export async function getEffectivePolicy() {
  if (policyCache) return policyCache;
  const [rows] = await pool.query(`SELECT * FROM ${POLICY_TABLE} WHERE id = 1 LIMIT 1`);
  if (!rows[0]) return LEAVE_POLICY; // Table not seeded yet (e.g. mid-migration) — fall back safely.
  const row = rows[0];
  policyCache = {
    probationMonthly: Number(row.probationMonthly),
    permanentUnderYearMonthly: Number(row.permanentUnderYearMonthly),
    permanentOverYearMonthly: Number(row.permanentOverYearMonthly),
    defaultAnnualLeaveDays: Number(row.defaultAnnualLeaveDays),
    qualifyingDays: Number(row.qualifyingDays),
  };
  return policyCache;
}

export async function updateLeavePolicy(data, updatedBy) {
  const current = await getEffectivePolicy();
  const merged = { ...current };
  for (const field of POLICY_FIELDS) {
    if (data[field] === undefined) continue;
    const value = Number(data[field]);
    if (!Number.isFinite(value) || value < 0) {
      const err = new Error(`${field} must be a non-negative number`);
      err.status = 400;
      throw err;
    }
    merged[field] = value;
  }
  await pool.query(
    `UPDATE ${POLICY_TABLE} SET probationMonthly = ?, permanentUnderYearMonthly = ?, permanentOverYearMonthly = ?, defaultAnnualLeaveDays = ?, qualifyingDays = ?, updatedBy = ? WHERE id = 1`,
    [merged.probationMonthly, merged.permanentUnderYearMonthly, merged.permanentOverYearMonthly, merged.defaultAnnualLeaveDays, merged.qualifyingDays, updatedBy]
  );
  policyCache = merged;
  return merged;
}

// Which weekday numbers (0=Sun..6=Sat) don't count as a leave day when a
// request spans a range. Sri Lanka commonly runs a 6-day work week, so only
// Sunday is excluded by default — change this array if your company works
// Mon-Fri instead (e.g. [0, 6]).
const NON_WORKING_WEEKDAYS = [0];

export async function ensureLeaveTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${PROFILE_TABLE} (
      empNo VARCHAR(64) NOT NULL PRIMARY KEY,
      joinDate DATE NULL,
      employmentType VARCHAR(16) NOT NULL DEFAULT 'probation',
      probationMonths INT NOT NULL DEFAULT 6,
      managerEmpNo VARCHAR(64) NULL,
      annualLeaveDays DECIMAL(5,1) NULL,
      annualLeaveSet BOOLEAN NOT NULL DEFAULT FALSE,
      annualLeaveSetBy VARCHAR(255) NULL,
      annualLeaveSetAt TIMESTAMP NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migrations: department assignment + date of birth (for the birthday
  // notification), added on top of the original profile table.
  for (const stmt of [
    `ALTER TABLE ${PROFILE_TABLE} ADD COLUMN departmentId INT NULL AFTER managerEmpNo`,
    `ALTER TABLE ${PROFILE_TABLE} ADD COLUMN birthDate DATE NULL AFTER departmentId`,
  ]) {
    try {
      await pool.query(stmt);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") throw err;
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${REQUEST_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      empNo VARCHAR(64) NOT NULL,
      employeeName VARCHAR(255) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      days DECIMAL(5,1) NOT NULL,
      reason TEXT,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      paidDays DECIMAL(5,1) NOT NULL DEFAULT 0,
      noPayDays DECIMAL(5,1) NOT NULL DEFAULT 0,
      reviewedBy VARCHAR(255) NULL,
      reviewerName VARCHAR(255) NULL,
      reviewNote TEXT NULL,
      employeeSeen BOOLEAN NOT NULL DEFAULT TRUE,
      requestedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewedAt TIMESTAMP NULL,
      INDEX (empNo),
      INDEX (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function toDateOnly(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function daysBetween(a, b) {
  return Math.round((toDateOnly(b) - toDateOnly(a)) / 86400000);
}

/** Counts leave days in an inclusive date range, skipping non-working weekdays. */
/**
 * Counts leave days in an inclusive date range, skipping non-working
 * weekdays and, if given, any date present in `holidayDates` (a Set of
 * "YYYY-MM-DD" strings). `holidayDates` defaults to empty so this stays
 * pure/synchronous for easy testing — real request-creation call sites
 * fetch the actual public holiday list first and pass it in.
 */
export function countLeaveDays(startDate, endDate, holidayDates = new Set()) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (!start || !end || end < start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!NON_WORKING_WEEKDAYS.includes(cursor.getUTCDay()) && !holidayDates.has(iso)) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function normalizeProfileRow(row) {
  if (!row) return null;
  return {
    ...row,
    annualLeaveSet: !!row.annualLeaveSet,
    annualLeaveDays: row.annualLeaveDays === null ? null : Number(row.annualLeaveDays),
    joinDate: row.joinDate ? new Date(row.joinDate).toISOString().slice(0, 10) : null,
    birthDate: row.birthDate ? new Date(row.birthDate).toISOString().slice(0, 10) : null,
    departmentId: row.departmentId === null || row.departmentId === undefined ? null : Number(row.departmentId),
  };
}

export async function getLeaveProfile(empNo) {
  const [rows] = await pool.query(`SELECT * FROM ${PROFILE_TABLE} WHERE empNo = ? LIMIT 1`, [empNo]);
  return normalizeProfileRow(rows[0]);
}

export async function upsertLeaveProfile(empNo, data, updatedBy) {
  const existing = await getLeaveProfile(empNo);
  const merged = {
    joinDate: data.joinDate !== undefined ? data.joinDate || null : existing?.joinDate || null,
    employmentType: data.employmentType || existing?.employmentType || "probation",
    probationMonths: data.probationMonths ?? existing?.probationMonths ?? 6,
    managerEmpNo: data.managerEmpNo !== undefined ? data.managerEmpNo || null : existing?.managerEmpNo || null,
    departmentId:
      data.departmentId !== undefined ? (data.departmentId === "" ? null : Number(data.departmentId)) : existing?.departmentId ?? null,
    birthDate: data.birthDate !== undefined ? data.birthDate || null : existing?.birthDate || null,
  };

  // Annual leave allocation is only ever set explicitly by HR/Admin — once
  // set it sticks (and can be edited again) until cleared.
  let annualLeaveDays = existing?.annualLeaveDays ?? null;
  let annualLeaveSet = existing?.annualLeaveSet ?? false;
  let annualLeaveSetBy = existing?.annualLeaveSetBy ?? null;
  let annualLeaveSetAt = existing?.annualLeaveSetAt ?? null;

  if (data.annualLeaveDays !== undefined) {
    if (data.annualLeaveDays === null || data.annualLeaveDays === "") {
      annualLeaveDays = null;
      annualLeaveSet = false;
      annualLeaveSetBy = null;
      annualLeaveSetAt = null;
    } else {
      annualLeaveDays = Number(data.annualLeaveDays);
      annualLeaveSet = true;
      annualLeaveSetBy = updatedBy || existing?.annualLeaveSetBy || null;
      annualLeaveSetAt = new Date();
    }
  }

  if (!["probation", "permanent"].includes(merged.employmentType)) {
    const err = new Error("employmentType must be 'probation' or 'permanent'");
    err.status = 400;
    throw err;
  }

  await pool.query(
    `INSERT INTO ${PROFILE_TABLE}
      (empNo, joinDate, employmentType, probationMonths, managerEmpNo, departmentId, birthDate, annualLeaveDays, annualLeaveSet, annualLeaveSetBy, annualLeaveSetAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       joinDate = VALUES(joinDate),
       employmentType = VALUES(employmentType),
       probationMonths = VALUES(probationMonths),
       managerEmpNo = VALUES(managerEmpNo),
       departmentId = VALUES(departmentId),
       birthDate = VALUES(birthDate),
       annualLeaveDays = VALUES(annualLeaveDays),
       annualLeaveSet = VALUES(annualLeaveSet),
       annualLeaveSetBy = VALUES(annualLeaveSetBy),
       annualLeaveSetAt = VALUES(annualLeaveSetAt)`,
    [
      empNo,
      merged.joinDate,
      merged.employmentType,
      merged.probationMonths,
      merged.managerEmpNo,
      merged.departmentId,
      merged.birthDate,
      annualLeaveDays,
      annualLeaveSet,
      annualLeaveSetBy,
      annualLeaveSetAt,
    ]
  );

  return getLeaveProfile(empNo);
}

/**
 * Works out which policy "stage" an employee is in as of a given date, and
 * which scheme (monthly quota vs annual pool) currently governs their leave.
 */
/**
 * Works out which policy "stage" an employee is in as of a given date, and
 * which scheme (monthly quota vs annual pool) currently governs their leave.
 * `policy` defaults to the built-in constants (kept pure/synchronous for
 * easy unit testing) — computeLeaveBalance below passes in the actual
 * admin-configured policy for real requests.
 */
export function computeStage(profile, asOfDate = new Date(), policy = LEAVE_POLICY) {
  if (!profile || !profile.joinDate) {
    return { stage: "unset", scheme: null, quota: 0, periodStart: null, periodEnd: null, daysSinceJoin: null };
  }
  const join = toDateOnly(profile.joinDate);
  const today = toDateOnly(asOfDate);
  const daysSinceJoin = daysBetween(join, today);
  const qualifies = daysSinceJoin >= policy.qualifyingDays;

  if (profile.employmentType === "probation") {
    return monthlyStage("probation", policy.probationMonthly, today, daysSinceJoin);
  }

  if (!qualifies) {
    return monthlyStage("permanent_under_year", policy.permanentUnderYearMonthly, today, daysSinceJoin);
  }

  if (profile.annualLeaveSet && profile.annualLeaveDays !== null) {
    // Annual pool renews every `qualifyingDays` from the join date.
    const cyclesElapsed = Math.floor(daysSinceJoin / policy.qualifyingDays);
    const periodStart = new Date(join);
    periodStart.setUTCDate(periodStart.getUTCDate() + cyclesElapsed * policy.qualifyingDays);
    const periodEnd = new Date(periodStart);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + policy.qualifyingDays - 1);
    return {
      stage: "permanent_over_year",
      scheme: "annual",
      quota: profile.annualLeaveDays,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      daysSinceJoin,
    };
  }

  return monthlyStage("permanent_over_year", policy.permanentOverYearMonthly, today, daysSinceJoin);
}

function monthlyStage(stage, quota, today, daysSinceJoin) {
  const periodStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  return {
    stage,
    scheme: "monthly",
    quota,
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    daysSinceJoin,
  };
}

/** Sum of paidDays for approved requests overlapping [start,end], optionally excluding one request id. */
async function sumApprovedPaidDays(empNo, periodStart, periodEnd, excludeId) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(paidDays), 0) AS total FROM ${REQUEST_TABLE}
     WHERE empNo = ? AND status = 'approved' AND startDate <= ? AND endDate >= ?
     ${excludeId ? "AND id != ?" : ""}`,
    excludeId ? [empNo, periodEnd, periodStart, excludeId] : [empNo, periodEnd, periodStart]
  );
  return Number(rows[0].total) || 0;
}

async function sumPendingDays(empNo) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(days), 0) AS total FROM ${REQUEST_TABLE} WHERE empNo = ? AND status = 'pending'`,
    [empNo]
  );
  return Number(rows[0].total) || 0;
}

/**
 * Computes an employee's current leave balance. Pass excludeRequestId when
 * evaluating "what would remain if this specific pending request were
 * removed from the picture" (used when approving that same request).
 */
export async function computeLeaveBalance(empNo, { asOfDate = new Date(), excludeRequestId } = {}) {
  const profile = await getLeaveProfile(empNo);
  const policy = await getEffectivePolicy();
  const stageInfo = computeStage(profile, asOfDate, policy);

  if (stageInfo.stage === "unset") {
    return {
      needsSetup: true,
      scheme: null,
      quota: 0,
      used: 0,
      remaining: 0,
      pendingDays: 0,
      stage: "unset",
      periodStart: null,
      periodEnd: null,
    };
  }

  const used = await sumApprovedPaidDays(empNo, stageInfo.periodStart, stageInfo.periodEnd, excludeRequestId);
  const pendingDays = await sumPendingDays(empNo);
  const remaining = Math.max(0, stageInfo.quota - used);

  return {
    needsSetup: false,
    scheme: stageInfo.scheme,
    stage: stageInfo.stage,
    quota: stageInfo.quota,
    used,
    remaining,
    pendingDays,
    periodStart: stageInfo.periodStart,
    periodEnd: stageInfo.periodEnd,
    warning: remaining <= 0,
  };
}

export async function createLeaveRequest({ empNo, employeeName, startDate, endDate, reason }) {
  const holidayDates = await getHolidayDatesInRange(startDate, endDate);
  const days = countLeaveDays(startDate, endDate, holidayDates);
  if (days <= 0) {
    const err = new Error("End date must be on or after start date, and cover at least one working day");
    err.status = 400;
    throw err;
  }

  // Prevent an employee from double-booking themselves — a new request
  // can't overlap any of their own requests that are still pending or
  // already approved (a rejected/cancelled one doesn't block anything).
  const [overlapping] = await pool.query(
    `SELECT id, startDate, endDate, status FROM ${REQUEST_TABLE}
     WHERE empNo = ? AND status IN ('pending','approved') AND startDate <= ? AND endDate >= ?`,
    [empNo, endDate, startDate]
  );
  if (overlapping.length > 0) {
    const clash = overlapping[0];
    const err = new Error(
      `This overlaps a request you already have (${clash.status}) for ${new Date(clash.startDate)
        .toISOString()
        .slice(0, 10)} to ${new Date(clash.endDate).toISOString().slice(0, 10)}.`
    );
    err.status = 409;
    throw err;
  }

  const [result] = await pool.query(
    `INSERT INTO ${REQUEST_TABLE} (empNo, employeeName, startDate, endDate, days, reason, status, employeeSeen)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', TRUE)`,
    [empNo, employeeName, startDate, endDate, days, reason || ""]
  );
  return getLeaveRequestById(result.insertId);
}

/**
 * Lets an employee withdraw their own request while it's still pending —
 * once a manager/HR has made a decision, it's part of the record and can
 * no longer be pulled back (they'd need to ask the reviewer to reject it,
 * or HR/admin can use adminCancelRequest below).
 */
export async function withdrawLeaveRequest(id, empNo) {
  const request = await getLeaveRequestById(id);
  if (!request || request.empNo !== empNo) {
    const err = new Error("Leave request not found");
    err.status = 404;
    throw err;
  }
  if (request.status !== "pending") {
    const err = new Error("Only a pending request can be withdrawn — this one has already been reviewed.");
    err.status = 409;
    throw err;
  }
  await pool.query(`UPDATE ${REQUEST_TABLE} SET status = 'cancelled' WHERE id = ?`, [id]);
  return getLeaveRequestById(id);
}

/** Admin/HR override: cancels any pending request for an employee — used e.g. when off-boarding them. */
export async function cancelAllPendingForEmployee(empNo, note) {
  await pool.query(
    `UPDATE ${REQUEST_TABLE} SET status = 'cancelled', reviewNote = ?, employeeSeen = FALSE, reviewedAt = CURRENT_TIMESTAMP
     WHERE empNo = ? AND status = 'pending'`,
    [note || "Cancelled automatically", empNo]
  );
}

/** Removes an employee's leave profile — used when the employee record itself is deleted. */
export async function deleteLeaveProfile(empNo) {
  await pool.query(`DELETE FROM ${PROFILE_TABLE} WHERE empNo = ?`, [empNo]);
}

function normalizeRequestRow(row) {
  if (!row) return null;
  const toIso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
  return {
    ...row,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    days: Number(row.days),
    paidDays: Number(row.paidDays),
    noPayDays: Number(row.noPayDays),
    employeeSeen: !!row.employeeSeen,
    requestedAt: row.requestedAt instanceof Date ? row.requestedAt.toISOString() : row.requestedAt,
    reviewedAt: row.reviewedAt instanceof Date ? row.reviewedAt.toISOString() : row.reviewedAt,
  };
}

export async function getLeaveRequestById(id) {
  const [rows] = await pool.query(`SELECT * FROM ${REQUEST_TABLE} WHERE id = ? LIMIT 1`, [id]);
  return normalizeRequestRow(rows[0]);
}

export async function getLeaveRequestsForEmployee(empNo, { months } = {}) {
  const [rows] = await pool.query(
    `SELECT * FROM ${REQUEST_TABLE} WHERE empNo = ? ${months ? "AND requestedAt >= DATE_SUB(NOW(), INTERVAL ? MONTH)" : ""} ORDER BY requestedAt DESC`,
    months ? [empNo, months] : [empNo]
  );
  return rows.map(normalizeRequestRow);
}

export async function getAllLeaveRequests({ status } = {}) {
  const [rows] = await pool.query(
    `SELECT * FROM ${REQUEST_TABLE} ${status ? "WHERE status = ?" : ""} ORDER BY
       CASE status WHEN 'pending' THEN 0 ELSE 1 END, requestedAt DESC`,
    status ? [status] : []
  );
  return rows.map(normalizeRequestRow);
}

/**
 * Server-side paginated version of the above, for the actual browsable
 * approval queue — the unpaginated version above stays in use wherever the
 * full set is genuinely needed (e.g. counting all-time pending requests for
 * a manager's dashboard badge).
 */
export async function getAllLeaveRequestsPaged({ status, empNos, page = 1, pageSize = 20 } = {}) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  // empNos being an explicitly-provided empty array (e.g. a manager whose
  // department currently has zero employees) must mean "show nothing", not
  // "no filter was requested" — and MySQL doesn't allow an empty IN (...).
  if (empNos && empNos.length === 0) {
    return { items: [], total: 0, page: safePage, pageSize: safePageSize };
  }

  const clauses = [];
  const params = [];
  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (empNos && empNos.length > 0) {
    clauses.push(`empNo IN (${empNos.map(() => "?").join(",")})`);
    params.push(...empNos);
  }
  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${REQUEST_TABLE} ${whereClause}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM ${REQUEST_TABLE} ${whereClause} ORDER BY
       CASE status WHEN 'pending' THEN 0 ELSE 1 END, requestedAt DESC LIMIT ? OFFSET ?`,
    [...params, safePageSize, offset]
  );

  return { items: rows.map(normalizeRequestRow), total, page: safePage, pageSize: safePageSize };
}

export async function getUnseenDecisions(empNo) {
  const [rows] = await pool.query(
    `SELECT * FROM ${REQUEST_TABLE} WHERE empNo = ? AND status != 'pending' AND employeeSeen = FALSE ORDER BY reviewedAt DESC`,
    [empNo]
  );
  return rows.map(normalizeRequestRow);
}

export async function markRequestSeen(id, empNo) {
  await pool.query(`UPDATE ${REQUEST_TABLE} SET employeeSeen = TRUE WHERE id = ? AND empNo = ?`, [id, empNo]);
}

/**
 * Approves or rejects a request. On approval, splits the requested days into
 * paidDays (covered by remaining balance) and noPayDays (the overflow),
 * based on the balance calculated *excluding this request*.
 */
export async function decideLeaveRequest(id, { decision, note, reviewedBy, reviewerName }) {
  const request = await getLeaveRequestById(id);
  if (!request) {
    const err = new Error("Leave request not found");
    err.status = 404;
    throw err;
  }
  if (request.status !== "pending") {
    const err = new Error("This request has already been reviewed");
    err.status = 409;
    throw err;
  }
  if (!["approved", "rejected"].includes(decision)) {
    const err = new Error("decision must be 'approved' or 'rejected'");
    err.status = 400;
    throw err;
  }
  if (decision === "rejected" && !note?.trim()) {
    const err = new Error("Please give a reason when rejecting a leave request");
    err.status = 400;
    throw err;
  }

  let paidDays = 0;
  let noPayDays = 0;
  if (decision === "approved") {
    const balance = await computeLeaveBalance(request.empNo, {
      asOfDate: request.startDate,
      excludeRequestId: request.id,
    });
    const available = balance.needsSetup ? 0 : balance.remaining;
    paidDays = Math.min(request.days, Math.max(0, available));
    noPayDays = request.days - paidDays;
  }

  await pool.query(
    `UPDATE ${REQUEST_TABLE}
     SET status = ?, paidDays = ?, noPayDays = ?, reviewedBy = ?, reviewerName = ?, reviewNote = ?,
         employeeSeen = FALSE, reviewedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [decision, paidDays, noPayDays, reviewedBy, reviewerName, note || "", id]
  );

  return getLeaveRequestById(id);
}

/**
 * Checks whether approving/pending a [startDate,endDate] request would push
 * a department's simultaneous leave count above the manager-set cap on any
 * single day. Doesn't block anything — callers use this to warn, not stop.
 */
export async function checkDepartmentCapacity(departmentId, startDate, endDate, { excludeRequestId } = {}) {
  if (!departmentId) return { exceeds: false };
  const [[dept]] = await pool.query(`SELECT maxConcurrentLeaves FROM departments WHERE id = ?`, [departmentId]);
  const max = dept?.maxConcurrentLeaves;
  if (!max) return { exceeds: false };

  const [empRows] = await pool.query(`SELECT empNo FROM ${PROFILE_TABLE} WHERE departmentId = ?`, [departmentId]);
  const empNos = empRows.map((r) => r.empNo);
  if (empNos.length === 0) return { exceeds: false };

  const [rows] = await pool.query(
    `SELECT startDate, endDate FROM ${REQUEST_TABLE}
     WHERE empNo IN (${empNos.map(() => "?").join(",")}) AND status IN ('pending','approved')
       AND startDate <= ? AND endDate >= ? ${excludeRequestId ? "AND id != ?" : ""}`,
    excludeRequestId ? [...empNos, endDate, startDate, excludeRequestId] : [...empNos, endDate, startDate]
  );

  let worstDay = null;
  let worstCount = 0;
  const cursor = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    const count = rows.filter((r) => {
      const s = toDateOnly(r.startDate).toISOString().slice(0, 10);
      const e = toDateOnly(r.endDate).toISOString().slice(0, 10);
      return s <= iso && e >= iso;
    }).length + 1; // +1 for the request being evaluated
    if (count > worstCount) {
      worstCount = count;
      worstDay = iso;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { exceeds: worstCount > max, max, worstCount, worstDay };
}

/**
 * Day-by-day availability for a set of employees (a department, or the
 * whole company) across a calendar month — who's on approved leave each day.
 */
export async function getAvailabilityCalendar({ departmentId, year, month }) {
  let empNos;
  let employees;
  if (departmentId) {
    const [rows] = await pool.query(
      `SELECT e.empNo, e.employeeName FROM ${PROFILE_TABLE} p JOIN employees e ON e.empNo = p.empNo WHERE p.departmentId = ?`,
      [departmentId]
    );
    employees = rows;
  } else {
    const [rows] = await pool.query(`SELECT empNo, employeeName FROM employees`);
    employees = rows;
  }
  empNos = employees.map((e) => e.empNo);

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  let leaveRows = [];
  if (empNos.length > 0) {
    const [rows] = await pool.query(
      `SELECT empNo, employeeName, startDate, endDate FROM ${REQUEST_TABLE}
       WHERE empNo IN (${empNos.map(() => "?").join(",")}) AND status = 'approved'
         AND startDate <= ? AND endDate >= ?`,
      [...empNos, monthEnd.toISOString().slice(0, 10), monthStart.toISOString().slice(0, 10)]
    );
    leaveRows = rows;
  }

  const days = {};
  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const iso = cursor.toISOString().slice(0, 10);
    const onLeave = leaveRows
      .filter((r) => {
        const s = toDateOnly(r.startDate).toISOString().slice(0, 10);
        const e = toDateOnly(r.endDate).toISOString().slice(0, 10);
        return s <= iso && e >= iso;
      })
      .map((r) => ({ empNo: r.empNo, employeeName: r.employeeName }));
    days[iso] = { onLeave, availableCount: Math.max(0, employees.length - onLeave.length) };
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { totalEmployees: employees.length, days };
}

/** Employees whose birthday (month/day) falls today or was yesterday — a 2-day visibility window. */
export async function getRecentAndUpcomingBirthdays() {
  const [rows] = await pool.query(
    `SELECT p.empNo, e.employeeName, p.birthDate FROM ${PROFILE_TABLE} p
     JOIN employees e ON e.empNo = p.empNo
     WHERE p.birthDate IS NOT NULL`
  );
  const today = toDateOnly(new Date());
  return rows
    .map((r) => {
      const bday = toDateOnly(r.birthDate);
      const thisYear = new Date(Date.UTC(today.getUTCFullYear(), bday.getUTCMonth(), bday.getUTCDate()));
      const diffDays = Math.round((today - thisYear) / 86400000);
      return { ...r, diffDays, thisYear: thisYear.toISOString().slice(0, 10) };
    })
    .filter((r) => r.diffDays === 0 || r.diffDays === 1)
    .map((r) => ({ empNo: r.empNo, employeeName: r.employeeName, date: r.thisYear, isToday: r.diffDays === 0 }));
}
