import { Router } from "express";
import {
  LEAVE_POLICY,
  countLeaveDays,
  getLeaveProfile,
  upsertLeaveProfile,
  computeLeaveBalance,
  createLeaveRequest,
  getLeaveRequestsForEmployee,
  getAllLeaveRequests,
  getUnseenDecisions,
  markRequestSeen,
  decideLeaveRequest,
} from "../services/leaveService.js";
import { getEmployeeByEmpNo } from "../services/employeeService.js";
import { addLog } from "../services/logService.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

/** Resolves the empNo a request should act on: an employee always acts on their own, others may target via query/body. */
function resolveEmpNo(req, source) {
  if (req.user.role === "employee") {
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

router.get("/policy", (req, res) => {
  res.json(LEAVE_POLICY);
});

// --- Leave profile (employment type, join date, manager, annual allocation) ---
router.get("/profile/:empNo", async (req, res, next) => {
  try {
    const isSelf = req.user.role === "employee" && req.user.empNo === req.params.empNo;
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
    const days = countLeaveDays(startDate, endDate);
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
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

router.get("/requests/mine", requirePermission("leaves", "request"), async (req, res, next) => {
  try {
    const empNo = resolveEmpNo(req, req.query);
    const requests = await getLeaveRequestsForEmployee(empNo);
    res.json(requests);
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
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
