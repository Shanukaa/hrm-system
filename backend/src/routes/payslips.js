import { Router } from "express";
import archiver from "archiver";
import { getAllEmployees, getEmployeeByEmpNo } from "../services/employeeService.js";
import { generatePayslipPdf, generateSimplePayslipPdf } from "../services/pdfService.js";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { addLog } from "../services/logService.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/:empNo", async (req, res, next) => {
  try {
    const employee = await getEmployeeByEmpNo(req.params.empNo);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const isSimple = req.query.format === "simple";
    const generate = isSimple ? generateSimplePayslipPdf : generatePayslipPdf;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payslip-${employee.empNo}-${(req.query.period || "current").replace(/\s+/g, "_")}${
        isSimple ? "-simple" : ""
      }.pdf"`
    );
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "payslip_generated",
      details: `Generated ${isSimple ? "simple" : "detailed"} payslip for ${employee.empNo}`,
      ip: req.ip,
    });
    generate(employee, res, req.query.period);
  } catch (err) {
    next(err);
  }
});

// Bulk-generate payslips for every employee (or a filtered subset via ?empNos=A,B,C) as a single zip.
router.get("/", async (req, res, next) => {
  try {
    const all = await getAllEmployees();
    const filterList = req.query.empNos ? req.query.empNos.split(",").map((s) => s.trim()) : null;
    const employees = filterList ? all.filter((e) => filterList.includes(e.empNo)) : all;

    if (employees.length === 0) {
      return res.status(404).json({ error: "No matching employees found" });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payslips-${(req.query.period || "current").replace(/\s+/g, "_")}.zip"`
    );

    const isSimple = req.query.format === "simple";
    const generate = isSimple ? generateSimplePayslipPdf : generatePayslipPdf;

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (const employee of employees) {
      const stream = new PassThrough();
      const chunks = [];
      stream.on("data", (c) => chunks.push(c));
      await new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);
        generate(employee, stream, req.query.period);
      });
      archive.append(Buffer.concat(chunks), { name: `payslip-${employee.empNo}${isSimple ? "-simple" : ""}.pdf` });
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

export default router;
