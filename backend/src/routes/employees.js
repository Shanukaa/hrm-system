import { Router } from "express";
import {
  getAllEmployees,
  getEmployeeByEmpNo,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../services/sheetsService.js";
import { calculatePayroll } from "../services/payrollCalc.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const employees = await getAllEmployees();
    res.json(employees);
  } catch (err) {
    next(err);
  }
});

router.get("/:empNo", async (req, res, next) => {
  try {
    const employee = await getEmployeeByEmpNo(req.params.empNo);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (!req.body.empNo || !req.body.employeeName) {
      return res.status(400).json({ error: "empNo and employeeName are required" });
    }
    const calculated = calculatePayroll(req.body);
    const created = await createEmployee(calculated);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put("/:empNo", async (req, res, next) => {
  try {
    const calculated = calculatePayroll({ ...req.body, empNo: req.params.empNo });
    const updated = await updateEmployee(req.params.empNo, calculated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:empNo", async (req, res, next) => {
  try {
    await deleteEmployee(req.params.empNo);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
