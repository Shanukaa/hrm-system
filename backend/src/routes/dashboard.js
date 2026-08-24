import { Router } from "express";
import { getAllEmployees } from "../services/employeeService.js";
import { getAllLeaveRequests } from "../services/leaveService.js";
import { can } from "../config/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", async (req, res, next) => {
  try {
    const employees = await getAllEmployees();
    const sum = (key) => employees.reduce((acc, e) => acc + (parseFloat(e[key]) || 0), 0);

    let pendingLeaveRequests = 0;
    if (can(req.user.role, "leaves", "viewAll")) {
      const pending = await getAllLeaveRequests({ status: "pending" });
      pendingLeaveRequests = pending.length;
    }

    res.json({
      employeeCount: employees.length,
      totalGrossSalary: sum("grossSalary"),
      totalNetSalary: sum("netSalary"),
      totalCostToCompany: sum("costToCompany"),
      totalEmployeeEpf: sum("employeeEpf8"),
      totalCompanyEpf: sum("companyEpf12"),
      totalEtf: sum("etf3"),
      costCentres: [...new Set(employees.map((e) => e.costCentre).filter(Boolean))].length,
      pendingLeaveRequests,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
