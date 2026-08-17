import { Router } from "express";
import multer from "multer";
import XLSX from "xlsx";
import { upsertEmployees } from "../services/employeeService.js";
import { calculatePayroll } from "../services/payrollCalc.js";
import { COLUMNS } from "../config/columns.js";
import { addLog } from "../services/logService.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.use(requireAuth, requirePermission("import", undefined));

// Maps flexible header text in the uploaded file -> our internal field key.
// Matching is case-insensitive and ignores spaces/punctuation, so
// "Attendance Allowance" and "Attendence Allowance" both resolve correctly.
function buildHeaderLookup() {
  const lookup = new Map();
  COLUMNS.forEach((col) => {
    const normalized = normalize(col.header);
    lookup.set(normalized, col.key);
  });
  // A few common aliases people tend to use in spreadsheets
  lookup.set(normalize("Attendance Allowance"), "attendanceAllowance");
  lookup.set(normalize("Target Allowance"), "targetAllowance");
  lookup.set(normalize("Company Contribution EPF 12%"), "companyEpf12");
  lookup.set(normalize("Employer EPF 12%"), "companyEpf12");
  lookup.set(normalize("Company EPF 12%"), "companyEpf12");
  lookup.set(normalize("EPF 12%"), "companyEpf12");
  lookup.set(normalize("APIT"), "apit");
  return lookup;
}

function normalize(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded (field name: file)" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rawRows.length === 0) {
      return res.status(400).json({ error: "The uploaded file has no data rows" });
    }

    const headerLookup = buildHeaderLookup();
    const records = [];
    const skipped = [];

    rawRows.forEach((row, idx) => {
      const mapped = {};
      Object.entries(row).forEach(([rawHeader, value]) => {
        const key = headerLookup.get(normalize(rawHeader));
        if (key) mapped[key] = value;
      });
      if (!mapped.empNo || !mapped.employeeName) {
        skipped.push({ row: idx + 2, reason: "Missing EMP NO or Employee Name" });
        return;
      }
      records.push(calculatePayroll(mapped));
    });

    if (records.length === 0) {
      return res.status(400).json({ error: "No valid rows found", skipped });
    }

    const result = await upsertEmployees(records);
    await addLog({
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "employees_imported",
      details: `Imported file: ${result.created} created, ${result.updated} updated, ${skipped.length} skipped`,
      ip: req.ip,
    });
    res.json({ ...result, skipped, totalRows: rawRows.length });
  } catch (err) {
    next(err);
  }
});

export default router;
