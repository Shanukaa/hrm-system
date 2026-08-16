import PDFDocument from "pdfkit";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const COMPANY_NAME = process.env.COMPANY_NAME || "Your Company (Pvt) Ltd";
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || "";
const COMPANY_LOGO_PATH = process.env.COMPANY_LOGO_PATH || "";

const INK = "#161C27";
const ACCENT = "#A8813C";
const LINE = "#DCD5C7";
const MUTED = "#6B7280";

const money = (n) =>
  "Rs. " +
  Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function payPeriodLabel(period) {
  if (!period) return new Date().toLocaleDateString("en-LK", { month: "long", year: "numeric" });
  return period;
}

/**
 * Streams a single employee's payslip as a PDF into the given writable stream (e.g. an HTTP response).
 */
export function generatePayslipPdf(employee, res, period) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  drawLetterhead(doc);
  drawTitle(doc, employee, period);
  drawEmployeeInfo(doc, employee);
  drawEarningsAndDeductions(doc, employee);
  drawSummary(doc, employee);
  drawFooter(doc);

  doc.end();
}

/**
 * Streams a single employee's payslip in the simplified "bank advice" style
 * (Process Month / EARNINGS / DEDUCTIONS / NET SALARY / EPF & ETF / bank
 * credit line) alongside the detailed one above. Uses the same underlying
 * salary fields — no separate data entry needed.
 */
export function generateSimplePayslipPdf(employee, res, period) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  drawLetterhead(doc);

  const y0 = 118;
  doc
    .fillColor(INK)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`Process Month : ${simplePeriodLabel(period)}`, 40, y0);

  let y = y0 + 28;

  const idLeft = [
    ["Employee", employee.employeeName],
    ["EMP No", employee.empNo],
    ["Designation", employee.designation],
  ];
  const idRight = [
    ["Cost Centre", employee.costCentre],
    ["NIC No", employee.nicNo],
    ["EPF No", employee.epfNo],
  ];
  doc.font("Helvetica").fontSize(9.5);
  idLeft.forEach(([label, value], i) => {
    doc.fillColor(MUTED).text(label, 40, y + i * 15, { width: 90 });
    doc.fillColor(INK).font("Helvetica-Bold").text(value || "-", 130, y + i * 15, { width: 170 });
    doc.font("Helvetica");
  });
  idRight.forEach(([label, value], i) => {
    doc.fillColor(MUTED).text(label, 320, y + i * 15, { width: 80 });
    doc.fillColor(INK).font("Helvetica-Bold").text(value || "-", 400, y + i * 15, { width: 115 });
    doc.font("Helvetica");
  });
  y += 15 * 3 + 14;
  doc.moveTo(40, y).lineTo(515, y).strokeColor(LINE).lineWidth(1).stroke();
  y += 18;

  const STAMP_DUTY = 25;

  const earningsRows = [
    ["BASIC SALARY", employee.basicSalary],
    ["OPERATIONAL ALLOWANCE", employee.operationalAllowance],
    ["ATTENDANCE ALLOWANCE", employee.attendanceAllowance],
    ["TARGET ALLOWANCE", employee.targetAllowance],
    ["TOTAL OT PAY", employee.totalOtPay],
  ];
  const totalEarnings =
    Number(employee.basicSalary || 0) +
    Number(employee.operationalAllowance || 0) +
    Number(employee.attendanceAllowance || 0) +
    Number(employee.targetAllowance || 0) +
    Number(employee.totalOtPay || 0);

  const deductionRows = [
    ["NOPAY AMOUNT", employee.nopayAmount],
    ["STAMP DUTY", STAMP_DUTY],
    ["EPF EMPLOYEE CONTRIBUTION (8%)", employee.employeeEpf8],
    ["APIT", employee.apit],
    ["OTHER DEDUCTIONS", employee.deductions],
  ];

  const totalDeduction =
    Number(employee.nopayAmount || 0) +
    STAMP_DUTY +
    Number(employee.employeeEpf8 || 0) +
    Number(employee.apit || 0) +
    Number(employee.deductions || 0);
  const netSalarySimple = totalEarnings - totalDeduction;
  const totalEpfContribution =
    Number(employee.employeeEpf8 || 0) + Number(employee.companyEpf12 || 0) + Number(employee.etf3 || 0);

  doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text("EARNINGS - - - - - - - - - >", 40, y);
  y += 20;
  earningsRows.forEach(([label, value]) => {
    doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(label, 60, y, { width: 300 });
    doc.text(money(value), 400, y, { width: 115, align: "right" });
    y += 18;
  });
  y += 6;
  doc.moveTo(400, y).lineTo(515, y).dash(2, { space: 2 }).strokeColor(LINE).lineWidth(1).stroke();
  doc.undash();
  y += 4;
  doc.font("Helvetica-Bold").fillColor(INK).text("TOTAL EARNINGS", 60, y, { width: 300 });
  doc.text(money(totalEarnings), 400, y, { width: 115, align: "right" });
  y += 34;

  doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text("DEDUCTIONS - - - - - - - - - >", 40, y);
  y += 20;
  deductionRows.forEach(([label, value]) => {
    doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(label, 60, y, { width: 300 });
    doc.text(money(value), 400, y, { width: 115, align: "right" });
    y += 18;
  });
  y += 6;
  doc.moveTo(400, y).lineTo(515, y).dash(2, { space: 2 }).strokeColor(LINE).lineWidth(1).stroke();
  doc.undash();
  y += 4;
  doc.font("Helvetica-Bold").fillColor(INK).text("TOTAL DEDUCTION", 60, y, { width: 300 });
  doc.text(money(totalDeduction), 400, y, { width: 115, align: "right" });
  y += 34;

  doc.moveTo(400, y).lineTo(515, y).strokeColor(INK).lineWidth(1.2).stroke();
  y += 3;
  doc.moveTo(400, y).lineTo(515, y).strokeColor(INK).lineWidth(1.2).stroke();
  y += 8;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(ACCENT).text("NET SALARY", 60, y, { width: 300 });
  doc.text(money(netSalarySimple), 400, y, { width: 115, align: "right" });
  y += 36;

  const employerRows = [
    ["EPF COMPANY CONTRIBUTION", employee.companyEpf12],
    ["ETF COMPANY CONTRIBUTION", employee.etf3],
    ["TOTAL EPF CONTRIBUTION", totalEpfContribution],
    ["COST TO THE COMPANY", employee.costToCompany],
  ];
  doc.font("Helvetica").fontSize(9.5);
  employerRows.forEach(([label, value]) => {
    doc.fillColor(INK).text(label, 40, y, { width: 300 });
    doc.text(money(value), 400, y, { width: 115, align: "right" });
    y += 18;
  });
  y += 10;

  const bankLabel = employee.bankName ? employee.bankName.toUpperCase() : "BANK NOT SET";
  const bankDetail = [employee.bankAccountNo].filter(Boolean).join("  ·  ");
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(bankLabel, 40, y, { width: 240 });
  if (bankDetail) {
    doc.font("Helvetica").fillColor(MUTED).text(bankDetail, 40, y + 15, { width: 240 });
  }
  doc.font("Helvetica").fillColor(MUTED).text("<- - Credited", 400, y + (bankDetail ? 4 : 0), { width: 115 });

  doc.end();
}

function simplePeriodLabel(period) {
  if (period) {
    // Accept "2026 / July" style or a normal month label and normalize to "YYYY / Month".
    const parsed = new Date(period);
    if (!isNaN(parsed)) {
      return `${parsed.getFullYear()} / ${parsed.toLocaleDateString("en-LK", { month: "long" })}`;
    }
    return period;
  }
  const now = new Date();
  return `${now.getFullYear()} / ${now.toLocaleDateString("en-LK", { month: "long" })}`;
}

function drawLetterhead(doc) {
  const top = 40;
  if (COMPANY_LOGO_PATH && fs.existsSync(COMPANY_LOGO_PATH)) {
    try {
      doc.image(COMPANY_LOGO_PATH, 40, top, { height: 44 });
    } catch (e) {
      /* ignore broken logo file */
    }
  } else {
    // Placeholder logo mark: a simple monogram square so the layout still reads as a letterhead
    doc.roundedRect(40, top, 44, 44, 6).fill(ACCENT);
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(COMPANY_NAME.trim().charAt(0).toUpperCase(), 40, top + 12, { width: 44, align: "center" });
  }

  doc
    .fillColor(INK)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(COMPANY_NAME, 96, top, { width: 380 });
  if (COMPANY_ADDRESS) {
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(9)
      .text(COMPANY_ADDRESS, 96, top + 20, { width: 380 });
  }

  doc.moveTo(40, top + 62).lineTo(555, top + 62).strokeColor(LINE).lineWidth(1).stroke();
}

function drawTitle(doc, employee, period) {
  const y = 118;
  doc
    .fillColor(INK)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("SALARY PAYSLIP", 40, y);
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(10)
    .text(`Pay period: ${payPeriodLabel(period)}`, 40, y + 18);
}

function drawEmployeeInfo(doc, employee) {
  const y = 158;
  const left = 40;
  const right = 300;
  const rowH = 16;

  const leftRows = [
    ["Employee Name", employee.employeeName],
    ["EMP No", employee.empNo],
    ["Designation", employee.designation],
    ["Cost Centre", employee.costCentre],
  ];
  const rightRows = [
    ["NIC No", employee.nicNo],
    ["EPF No", employee.epfNo],
  ];

  doc.font("Helvetica").fontSize(9.5);
  leftRows.forEach(([label, value], i) => {
    doc.fillColor(MUTED).text(label, left, y + i * rowH, { width: 110 });
    doc.fillColor(INK).font("Helvetica-Bold").text(value ?? "-", left + 110, y + i * rowH, { width: 140 });
    doc.font("Helvetica");
  });
  rightRows.forEach(([label, value], i) => {
    doc.fillColor(MUTED).text(label, right, y + i * rowH, { width: 90 });
    doc.fillColor(INK).font("Helvetica-Bold").text(value ?? "-", right + 90, y + i * rowH, { width: 150 });
    doc.font("Helvetica");
  });

  doc.moveTo(40, y + 76).lineTo(555, y + 76).strokeColor(LINE).lineWidth(1).stroke();
}

function drawEarningsAndDeductions(doc, employee) {
  const y = 250;
  const colW = 257;
  const leftX = 40;
  const rightX = 40 + colW + 18;

  const earnings = [
    ["Basic Salary", employee.basicSalary],
    ["Nopay Amount", -Math.abs(Number(employee.nopayAmount || 0))],
    ["Adjusted Basic", employee.adjustedBasic],
    ["Operational Allowance", employee.operationalAllowance],
    ["Attendance Allowance", employee.attendanceAllowance],
    ["Target Allowance", employee.targetAllowance],
    ["Total OT Pay", employee.totalOtPay],
  ];
  const deductions = [
    ["Employee EPF (8%)", employee.employeeEpf8],
    ["Apit", employee.apit],
    ["Other Deductions", employee.deductions],
  ];

  drawTable(doc, leftX, y, colW, "EARNINGS", earnings, employee.grossSalary, "Gross Salary");
  drawTable(doc, rightX, y, colW, "DEDUCTIONS", deductions, null, null);

  return y;
}

function drawTable(doc, x, y, width, title, rows, totalValue, totalLabel) {
  doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(9.5).text(title, x, y);
  doc.moveTo(x, y + 16).lineTo(x + width, y + 16).strokeColor(LINE).lineWidth(1).stroke();

  let rowY = y + 24;
  doc.font("Helvetica").fontSize(9.5);
  rows.forEach(([label, value]) => {
    doc.fillColor(INK).text(label, x, rowY, { width: width - 90 });
    doc.text(money(value), x + width - 90, rowY, { width: 90, align: "right" });
    rowY += 17;
  });

  if (totalValue !== null) {
    doc.moveTo(x, rowY + 2).lineTo(x + width, rowY + 2).strokeColor(LINE).lineWidth(1).stroke();
    doc
      .font("Helvetica-Bold")
      .fillColor(INK)
      .text(totalLabel, x, rowY + 10, { width: width - 90 });
    doc.text(money(totalValue), x + width - 90, rowY + 10, { width: 90, align: "right" });
  }
}

function drawSummary(doc, employee) {
  const y = 430;
  doc.roundedRect(40, y, 515, 96, 6).fillAndStroke("#F4F6F5", LINE);

  const cells = [
    ["Gross Salary", employee.grossSalary],
    ["Total Deductions", Number(employee.employeeEpf8 || 0) + Number(employee.apit || 0) + Number(employee.deductions || 0)],
    ["Net Salary", employee.netSalary],
  ];

  const cellW = 515 / 3;
  cells.forEach(([label, value], i) => {
    const cx = 40 + i * cellW;
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(label.toUpperCase(), cx + 18, y + 18);
    doc
      .fillColor(i === 2 ? ACCENT : INK)
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(money(value), cx + 18, y + 34, { width: cellW - 30 });
  });

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(8.5)
    .text(
      `Employer contributions (not deducted from employee): Company EPF 12% ${money(
        employee.companyEpf12
      )}  |  ETF 3% ${money(employee.etf3)}  |  Cost to Company ${money(employee.costToCompany)}`,
      58,
      y + 68,
      { width: 480 }
    );
}

function drawFooter(doc) {
  const y = 560;
  doc.moveTo(40, y).lineTo(555, y).dash(2, { space: 3 }).strokeColor(LINE).lineWidth(1).stroke();
  doc.undash();
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(8)
    .text(
      "This is a system-generated payslip and does not require a signature. For queries, contact HR.",
      40,
      y + 10,
      { width: 515, align: "center" }
    );
}
