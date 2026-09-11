import { Router } from "express";
import {
  LEAVE_POLICY,
  getEffectivePolicy,
  updateLeavePolicy,
  countLeaveDays,
  getLeaveProfile,
  upsertLeaveProfile,
  computeLeaveBalance,
  createLeaveRequest,
  getLeaveRequestsForEmployee,
  getAllLeaveRequests,
  getAllLeaveRequestsPaged,
  getLeaveSummary,
  getUnseenDecisions,
  markRequestSeen,
  decideLeaveRequest,
  checkDepartmentCapacity,
  getAvailabilityCalendar,
  withdrawLeaveRequest,
} from "../services/leaveService.js";
import { getEmployeeByEmpNo, updateEmployee } from "../services/employeeService.js";
import { calculatePayroll } from "../services/payrollCalc.js";
import { getHolidayDatesInRange } from "../services/holidayService.js";
import { addLog } from "../services/logService.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

/** Resolves the empNo a request should act on: an employee always acts on their own, others may target via query/body. */
function resolveEmpNo(req, source) {
  if (["employee", "manager"].includes(req.user.role)) {
    if (!req.user.empNo) {
      const err = new Error("Your account isn't linked to an employee record yet. Contact HR.");
      err.status = 400;
      throw err;
    }
    return req.user.empNo;
  }
  const empNo = source.empNo;
  if (!empNo) {
    const err = new Error("empNo is required");
    err.status = 400;
    throw err;
  }
  return empNo;
}

router.get("/policy", async (req, res, next) => {
  try {
    res.json(await getEffectivePolicy());
  } catch (err) {
    next(err);
  }
});

// Admin/HR Manager only: change the accrual numbers everyone's leave balance is computed against.
router.put("/policy", async (req, res, next) => {
  try {
    if (!["admin", "hr_manager"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only an admin or HR manager can change the leave policy" });
    }
    const updated = await updateLeavePolicy(req.body, req.user.email);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "leave_policy_updated",
      details: `Updated leave policy: ${JSON.stringify(updated)}`,
      ip: req.ip,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// --- Leave profile (employment type, join date, manager, annual allocation) ---
router.get("/profile/:empNo", async (req, res, next) => {
  try {
    const isSelf = ["employee", "manager"].includes(req.user.role) && req.user.empNo === req.params.empNo;
    if (!isSelf && !req.user.role.match(/^(admin|hr_manager|hr_executive|manager)$/)) {
      return res.status(403).json({ error: "You don't have permission to view this" });
    }
    const profile = await getLeaveProfile(req.params.empNo);
    res.json(profile || { empNo: req.params.empNo, joinDate: null, employmentType: "probation" });
  } catch (err) {
    next(err);
  }
});

router.put("/profile/:empNo", requirePermission("leaves", "manageProfile"), async (req, res, next) => {
  try {
    const employee = await getEmployeeByEmpNo(req.params.empNo);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    const profile = await upsertLeaveProfile(req.params.empNo, req.body, req.user.email);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "leave_profile_updated",
      details: `Updated leave profile for ${req.params.empNo}`,
      ip: req.ip,
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// --- Balance ---
router.get("/balance", async (req, res, next) => {
  try {
    const empNo = resolveEmpNo(req, req.query);
    const balance = await computeLeaveBalance(empNo);
    res.json(balance);
  } catch (err) {
    next(err);
  }
});

// --- Preview how many days a date range covers, before submitting ---
router.get("/preview", async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required" });
    const holidayDates = await getHolidayDatesInRange(startDate, endDate);
    const days = countLeaveDays(startDate, endDate, holidayDates);
    res.json({ days });
  } catch (err) {
    next(err);
  }
});

// --- Requests: employee creates, employee views own ---
router.post("/requests", requirePermission("leaves", "request"), async (req, res, next) => {
  try {
    const empNo = resolveEmpNo(req, req.body);
    const employee = await getEmployeeByEmpNo(empNo);
    if (!employee) return res.status(404).json({ error: "Employee record not found" });
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required" });

    const request = await createLeaveRequest({
      empNo,
      employeeName: employee.employeeName,
      startDate,
      endDate,
      reason,
    });
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "leave_requested",
      details: `${employee.employeeName} (${empNo}) requested leave ${startDate} to ${endDate}`,
      ip: req.ip,
    });

    let capacityWarning = null;
    const profile = await getLeaveProfile(empNo);
    if (profile?.departmentId) {
      capacityWarning = await checkDepartmentCapacity(profile.departmentId, startDate, endDate, {
        excludeRequestId: request.id,
      });
      if (!capacityWarning.exceeds) capacityWarning = null;
    }

    res.status(201).json({ ...request, capacityWarning });
  } catch (err) {
    next(err);
  }
});

router.get("/requests/mine", requirePermission("leaves", "request"), async (req, res, next) => {
  try {
    const empNo = resolveEmpNo(req, req.query);
    const requests = await getLeaveRequestsForEmployee(empNo, { months: req.query.months ? Number(req.query.months) : undefined });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// An employee/manager withdrawing their own still-pending request.
router.post("/requests/:id/withdraw", requirePermission("leaves", "request"), async (req, res, next) => {
  try {
    const empNo = resolveEmpNo(req, req.body);
    const updated = await withdrawLeaveRequest(req.params.id, empNo);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "leave_withdrawn",
      details: `${empNo} withdrew leave request #${updated.id}`,
      ip: req.ip,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get("/notifications", requirePermission("leaves", "request"), async (req, res, next) => {
  try {
    const empNo = resolveEmpNo(req, req.query);
    const notifications = await getUnseenDecisions(empNo);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

router.post("/requests/:id/ack", requirePermission("leaves", "request"), async (req, res, next) => {
  try {
    const empNo = resolveEmpNo(req, req.query);
    await markRequestSeen(req.params.id, empNo);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- Requests: manager / hr_manager / admin review queue ---
router.get("/requests", requirePermission("leaves", "viewAll"), async (req, res, next) => {
  try {
    if (req.query.page) {
      const result = await getAllLeaveRequestsPaged({
        status: req.query.status,
        empNos: req.query.empNos !== undefined ? req.query.empNos.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 20,
      });
      return res.json(result);
    }
    const requests = await getAllLeaveRequests({ status: req.query.status });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

router.put("/requests/:id/decision", requirePermission("leaves", "approve"), async (req, res, next) => {
  try {
    const { decision, note } = req.body;
    const updated = await decideLeaveRequest(req.params.id, {
      decision,
      note,
      reviewedBy: req.user.email,
      reviewerName: req.user.name,
    });
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: `leave_${decision}`,
      details: `${decision === "approved" ? "Approved" : "Rejected"} leave request #${updated.id} for ${updated.empNo}`,
      ip: req.ip,
    });

    let capacityWarning = null;
    let noPayApplied = null;
    if (decision === "approved") {
      const profile = await getLeaveProfile(updated.empNo);
      if (profile?.departmentId) {
        capacityWarning = await checkDepartmentCapacity(profile.departmentId, updated.startDate, updated.endDate);
        if (!capacityWarning.exceeds) capacityWarning = null;
      }

      // Any days beyond the employee's balance are unpaid — automatically
      // add that deduction to their payroll record rather than leaving HR
      // to calculate and type it in by hand. Rate = Basic Salary ÷ actual
      // calendar days in the request's month (this company's agreed
      // formula). If a request happens to straddle two months, the whole
      // thing uses the start date's month — a deliberate simplification
      // for the (rare) case a leave request spans a month boundary.
      if (updated.noPayDays > 0) {
        const employee = await getEmployeeByEmpNo(updated.empNo);
        if (employee) {
          const [y, m] = updated.startDate.split("-").map(Number);
          const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
          const dailyRate = (Number(employee.basicSalary) || 0) / daysInMonth;
          const deduction = Math.round(dailyRate * updated.noPayDays * 100) / 100;
          const newNopayAmount = Math.round(((Number(employee.nopayAmount) || 0) + deduction) * 100) / 100;

          const recalculated = calculatePayroll({ ...employee, nopayAmount: newNopayAmount });
          await updateEmployee(updated.empNo, recalculated);

          await addLog({
            userEmail: req.user.email,
            userRole: req.user.role,
            action: "payroll_nopay_auto_added",
            details: `Added Rs. ${deduction} no-pay (${updated.noPayDays} day(s) from leave request #${updated.id}) to ${updated.empNo}'s payroll — new total no-pay amount: Rs. ${newNopayAmount}. This carries forward until reset for the next pay cycle.`,
            ip: req.ip,
          });

          noPayApplied = { deduction, newNopayAmount, dailyRate: Math.round(dailyRate * 100) / 100 };
        }
      }
    }

    res.json({ ...updated, capacityWarning, noPayApplied });
  } catch (err) {
    next(err);
  }
});

// --- Capacity preview (used by the request form before submitting) ---
router.get("/capacity-check", async (req, res, next) => {
  try {
    const empNo = resolveEmpNo(req, req.query);
    const { startDate, endDate } = req.query;
    const profile = await getLeaveProfile(empNo);
    if (!profile?.departmentId) return res.json({ exceeds: false });
    const result = await checkDepartmentCapacity(profile.departmentId, startDate, endDate);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// --- Availability calendar (manager/hr_manager/admin: who's free each day) ---
router.get("/availability", requirePermission("leaves", "viewAll"), async (req, res, next) => {
  try {
    const { departmentId, year, month } = req.query;
    const result = await getAvailabilityCalendar({
      departmentId: departmentId ? Number(departmentId) : null,
      year: Number(year),
      month: Number(month),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Per-employee leave overview for HR Manager / Manager dashboards: quota,
// used this month, used year-to-date, remaining, and an over-limit flag.
// Pass ?empNos=A,B,C to scope it (a manager's department); omit for the
// org-wide view.
router.get("/summary", requirePermission("leaves", "viewAll"), async (req, res, next) => {
  try {
    const empNos = req.query.empNos !== undefined ? req.query.empNos.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const summary = await getLeaveSummary({ empNos });
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export default router;
