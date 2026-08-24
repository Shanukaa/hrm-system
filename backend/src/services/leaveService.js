import pool from "../config/db.js";

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
export function countLeaveDays(startDate, endDate) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (!start || !end || end < start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (!NON_WORKING_WEEKDAYS.includes(cursor.getUTCDay())) count++;
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
      (empNo, joinDate, employmentType, probationMonths, managerEmpNo, annualLeaveDays, annualLeaveSet, annualLeaveSetBy, annualLeaveSetAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       joinDate = VALUES(joinDate),
       employmentType = VALUES(employmentType),
       probationMonths = VALUES(probationMonths),
       managerEmpNo = VALUES(managerEmpNo),
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
export function computeStage(profile, asOfDate = new Date()) {
  if (!profile || !profile.joinDate) {
    return { stage: "unset", scheme: null, quota: 0, periodStart: null, periodEnd: null, daysSinceJoin: null };
  }
  const join = toDateOnly(profile.joinDate);
  const today = toDateOnly(asOfDate);
  const daysSinceJoin = daysBetween(join, today);
  const qualifies = daysSinceJoin >= LEAVE_POLICY.qualifyingDays;

  if (profile.employmentType === "probation") {
    return monthlyStage("probation", LEAVE_POLICY.probationMonthly, today, daysSinceJoin);
  }

  if (!qualifies) {
    return monthlyStage("permanent_under_year", LEAVE_POLICY.permanentUnderYearMonthly, today, daysSinceJoin);
  }

  if (profile.annualLeaveSet && profile.annualLeaveDays !== null) {
    // Annual pool renews every 365 days from the join date.
    const cyclesElapsed = Math.floor(daysSinceJoin / LEAVE_POLICY.qualifyingDays);
    const periodStart = new Date(join);
    periodStart.setUTCDate(periodStart.getUTCDate() + cyclesElapsed * LEAVE_POLICY.qualifyingDays);
    const periodEnd = new Date(periodStart);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + LEAVE_POLICY.qualifyingDays - 1);
    return {
      stage: "permanent_over_year",
      scheme: "annual",
      quota: profile.annualLeaveDays,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      daysSinceJoin,
    };
  }

  return monthlyStage("permanent_over_year", LEAVE_POLICY.permanentOverYearMonthly, today, daysSinceJoin);
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
  const stageInfo = computeStage(profile, asOfDate);

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
  const days = countLeaveDays(startDate, endDate);
  if (days <= 0) {
    const err = new Error("End date must be on or after start date, and cover at least one working day");
    err.status = 400;
    throw err;
  }
  const [result] = await pool.query(
    `INSERT INTO ${REQUEST_TABLE} (empNo, employeeName, startDate, endDate, days, reason, status, employeeSeen)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', TRUE)`,
    [empNo, employeeName, startDate, endDate, days, reason || ""]
  );
  return getLeaveRequestById(result.insertId);
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

export async function getLeaveRequestsForEmployee(empNo) {
  const [rows] = await pool.query(
    `SELECT * FROM ${REQUEST_TABLE} WHERE empNo = ? ORDER BY requestedAt DESC`,
    [empNo]
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
