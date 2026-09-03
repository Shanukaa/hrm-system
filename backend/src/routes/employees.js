import { Router } from "express";
import {
  getAllEmployees,
  getEmployeeByEmpNo,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../services/employeeService.js";
import { calculatePayroll } from "../services/payrollCalc.js";
import { addLog } from "../services/logService.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { getLeaveProfile, upsertLeaveProfile, deleteLeaveProfile, cancelAllPendingForEmployee } from "../services/leaveService.js";
import { unassignManagerEverywhere } from "../services/departmentService.js";
import { deactivateByEmpNo } from "../services/userService.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("employees", "view"), async (req, res, next) => {
  try {
    const employees = await getAllEmployees();
    res.json(employees);
  } catch (err) {
    next(err);
  }
});

// Non-sensitive fields shown to an employee/manager viewing their own record
// via the self-service portal — payroll figures (salary, bank details, etc.)
// are never exposed here.
const SELF_VIEW_FIELDS = ["empNo", "epfNo", "employeeName", "nicNo", "designation", "costCentre"];

router.get("/:empNo", async (req, res, next) => {
  try {
    const isSelf = ["employee", "manager"].includes(req.user.role) && req.user.empNo === req.params.empNo;
    if (!isSelf) {
      // Fall back to the normal permission check for HR/admin roles.
      const { can } = await import("../config/auth.js");
      if (!can(req.user.role, "employees", "view")) {
        return res.status(403).json({ error: "You don't have permission to do that" });
      }
    }

    const employee = await getEmployeeByEmpNo(req.params.empNo);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    if (isSelf) {
      const filtered = {};
      SELF_VIEW_FIELDS.forEach((k) => (filtered[k] = employee[k]));
      return res.json(filtered);
    }
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

// Date of birth is captured for every employee (regardless of whether their
// leave profile has been set up) so the birthday notification covers
// everyone. Any role that can edit employees can set it — not gated behind
// the fuller leave-profile permission.
router.put("/:empNo/birthdate", requirePermission("employees", "edit"), async (req, res, next) => {
  try {
    const employee = await getEmployeeByEmpNo(req.params.empNo);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    const profile = await upsertLeaveProfile(req.params.empNo, { birthDate: req.body.birthDate || null }, req.user.email);
    res.json({ empNo: req.params.empNo, birthDate: profile.birthDate });
  } catch (err) {
    next(err);
  }
});

router.post("/", requirePermission("employees", "create"), async (req, res, next) => {
  try {
    if (!req.body.empNo || !req.body.employeeName) {
      return res.status(400).json({ error: "empNo and employeeName are required" });
    }
    const calculated = calculatePayroll(req.body);
    const created = await createEmployee(calculated);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "employee_created",
      details: `Created employee ${created.empNo} (${created.employeeName})`,
      ip: req.ip,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put("/:empNo", requirePermission("employees", "edit"), async (req, res, next) => {
  try {
    const calculated = calculatePayroll({ ...req.body, empNo: req.params.empNo });
    const updated = await updateEmployee(req.params.empNo, calculated);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "employee_updated",
      details: `Updated employee ${updated.empNo} (${updated.employeeName})`,
      ip: req.ip,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:empNo", requirePermission("employees", "delete"), async (req, res, next) => {
  try {
    const empNo = req.params.empNo;
    // Deleting an employee record used to leave a trail of orphaned data —
    // a leave profile pointing nowhere, a department still listing them as
    // manager, and (once self-service logins existed) a user account tied
    // to a record that no longer exists. Clean all of that up as part of
    // the same operation, in an order that can't leave things half-done:
    // cancel anything still pending first (so nobody's request silently
    // vanishes), then unlink everything else, then delete the record itself.
    await cancelAllPendingForEmployee(empNo, "Cancelled automatically — the employee record was deleted.");
    await unassignManagerEverywhere(empNo);
    await deactivateByEmpNo(empNo);
    await deleteLeaveProfile(empNo);
    await deleteEmployee(empNo);

    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "employee_deleted",
      details: `Deleted employee ${empNo} (cascaded: leave profile removed, pending leave cancelled, department manager unassigned if applicable, linked login deactivated)`,
      ip: req.ip,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
