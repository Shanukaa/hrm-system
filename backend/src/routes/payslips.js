import { Router } from "express";
import archiver from "archiver";
import { getAllEmployees, getEmployeeByEmpNo } from "../services/employeeService.js";
import { generatePayslipPdf, generateSimplePayslipPdf } from "../services/pdfService.js";
import { getOrCreateSnapshot, deleteSnapshot, parsePeriodLabel } from "../services/payrollSnapshotService.js";
import { PassThrough } from "stream";
import { addLog } from "../services/logService.js";
import { requireAuth } from "../middleware/auth.js";
import { can } from "../config/auth.js";

const router = Router();

router.use(requireAuth);

/**
 * Resolves the exact figures a payslip for empNo/period should show:
 * the locked snapshot if one already exists (regardless of any salary
 * changes since), or the employee's current live record — which becomes
 * the new locked snapshot for that period from this point on.
 */
async function resolvePayslipData(empNo, period, generatedBy) {
  const employee = await getEmployeeByEmpNo(empNo);
  if (!employee) return null;
  const { snapshot, isNew } = await getOrCreateSnapshot({
    empNo,
    periodInput: period,
    liveEmployeeData: employee,
    generatedBy,
  });
  return { data: snapshot.employeeData, label: snapshot.periodLabel, isNew, generatedAt: snapshot.generatedAt };
}

router.get("/:empNo", async (req, res, next) => {
  try {
    const isSelf = ["employee", "manager"].includes(req.user.role) && req.user.empNo === req.params.empNo;
    if (!isSelf && !can(req.user.role, "payslips")) {
      return res.status(403).json({ error: "You don't have permission to do that" });
    }

    const resolved = await resolvePayslipData(req.params.empNo, req.query.period, req.user.email);
    if (!resolved) return res.status(404).json({ error: "Employee not found" });

    const isSimple = req.query.format === "simple";
    const generate = isSimple ? generateSimplePayslipPdf : generatePayslipPdf;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payslip-${req.params.empNo}-${resolved.label.replace(/\s+/g, "_")}${
        isSimple ? "-simple" : ""
      }.pdf"`
    );
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "payslip_generated",
      details: `${resolved.isNew ? "Locked and generated" : "Re-downloaded locked"} ${isSimple ? "simple" : "detailed"} payslip for ${req.params.empNo} (${resolved.label})`,
      ip: req.ip,
    });
    generate(resolved.data, res, resolved.label);
  } catch (err) {
    next(err);
  }
});

// Admin/HR-manager correction path: clears a locked payslip snapshot so the
// next download re-locks against current (presumably now-corrected) data.
// Deliberately not covered by the general "payslips" permission that
// hr_executive also has — altering a locked historical payroll record is a
// more sensitive action than viewing/downloading one.
router.delete("/:empNo/snapshot", async (req, res, next) => {
  try {
    if (!["admin", "hr_manager"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only an admin or HR manager can unlock a generated payslip" });
    }
    if (!req.query.period) return res.status(400).json({ error: "period is required" });
    await deleteSnapshot(req.params.empNo, req.query.period);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "payslip_snapshot_unlocked",
      details: `Unlocked payslip snapshot for ${req.params.empNo} (${req.query.period}) — next download will re-lock current data`,
      ip: req.ip,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Bulk-generate payslips for every employee (or a filtered subset via ?empNos=A,B,C) as a single zip.
router.get("/", async (req, res, next) => {
  try {
    if (!can(req.user.role, "payslips")) {
      return res.status(403).json({ error: "You don't have permission to do that" });
    }
    const all = await getAllEmployees();
    const filterList = req.query.empNos ? req.query.empNos.split(",").map((s) => s.trim()) : null;
    const employees = filterList ? all.filter((e) => filterList.includes(e.empNo)) : all;

    if (employees.length === 0) {
      return res.status(404).json({ error: "No matching employees found" });
    }

    const periodLabel = parsePeriodLabel(req.query.period).label;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="payslips-${periodLabel.replace(/\s+/g, "_")}.zip"`);

    const isSimple = req.query.format === "simple";
    const generate = isSimple ? generateSimplePayslipPdf : generatePayslipPdf;

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (const employee of employees) {
      const resolved = await resolvePayslipData(employee.empNo, req.query.period, req.user.email);
      if (!resolved) continue;
      const stream = new PassThrough();
      const chunks = [];
      stream.on("data", (c) => chunks.push(c));
      await new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);
        generate(resolved.data, stream, resolved.label);
      });
      archive.append(Buffer.concat(chunks), { name: `payslip-${employee.empNo}${isSimple ? "-simple" : ""}.pdf` });
    }

    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "payslip_bulk_generated",
      details: `Bulk-generated ${employees.length} payslip(s) for ${periodLabel}`,
      ip: req.ip,
    });

    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

export default router;
