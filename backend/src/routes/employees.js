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
    await deleteEmployee(req.params.empNo);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "employee_deleted",
      details: `Deleted employee ${req.params.empNo}`,
      ip: req.ip,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
