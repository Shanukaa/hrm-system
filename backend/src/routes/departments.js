import { Router } from "express";
import {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getEmployeesInDepartment,
  getDepartmentManagedBy,
} from "../services/departmentService.js";
import { addLog } from "../services/logService.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("departments", "view"), async (req, res, next) => {
  try {
    res.json(await getAllDepartments());
  } catch (err) {
    next(err);
  }
});

// The department the signed-in manager runs, if any (used by their dashboard).
router.get("/mine", async (req, res, next) => {
  try {
    if (!req.user.empNo) return res.json(null);
    res.json(await getDepartmentManagedBy(req.user.empNo));
  } catch (err) {
    next(err);
  }
});

router.get("/:id/employees", requirePermission("departments", "view"), async (req, res, next) => {
  try {
    res.json(await getEmployeesInDepartment(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post("/", requirePermission("departments", "manage"), async (req, res, next) => {
  try {
    const dept = await createDepartment(req.body);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "department_created",
      details: `Created department "${dept.name}"`,
      ip: req.ip,
    });
    res.status(201).json(dept);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("departments", "manage"), async (req, res, next) => {
  try {
    const dept = await updateDepartment(req.params.id, req.body);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "department_updated",
      details: `Updated department "${dept.name}"`,
      ip: req.ip,
    });
    res.json(dept);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("departments", "manage"), async (req, res, next) => {
  try {
    await deleteDepartment(req.params.id);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "department_deleted",
      details: `Deleted department #${req.params.id}`,
      ip: req.ip,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
