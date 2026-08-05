// Mirrors backend/src/config/columns.js — keep these in sync.
export const FIELDS = [
  { key: "empNo", label: "EMP No", type: "text", section: "identity", editable: true, required: true },
  { key: "epfNo", label: "EPF No", type: "text", section: "identity", editable: true },
  { key: "employeeName", label: "Employee Name", type: "text", section: "identity", editable: true, required: true },
  { key: "nicNo", label: "NIC No", type: "text", section: "identity", editable: true },
  { key: "designation", label: "Designation", type: "text", section: "identity", editable: true },
  { key: "costCentre", label: "Cost Centre", type: "text", section: "identity", editable: true },

  { key: "basicSalary", label: "Basic Salary", type: "number", section: "earnings", editable: true },
  { key: "operationalAllowance", label: "Operational Allowance", type: "number", section: "earnings", editable: true },
  { key: "attendanceAllowance", label: "Attendance Allowance", type: "number", section: "earnings", editable: true },
  { key: "targetAllowance", label: "Target Allowance", type: "number", section: "earnings", editable: true },
  { key: "nopayAmount", label: "Nopay Amount", type: "number", section: "earnings", editable: true },
  { key: "adjustedBasic", label: "Adjusted Basic", type: "number", section: "earnings", calculated: true },
  { key: "otPay", label: "OT Pay", type: "number", section: "earnings", editable: true },
  { key: "totalOtPay", label: "Total OT Pay", type: "number", section: "earnings", calculated: true },
  { key: "grossSalary", label: "Gross Salary", type: "number", section: "earnings", calculated: true },

  { key: "employeeEpf8", label: "Employee EPF (8%)", type: "number", section: "deductions", calculated: true },
  { key: "apit", label: "Apit", type: "number", section: "deductions", editable: true },
  { key: "deductions", label: "Deductions", type: "number", section: "deductions", editable: true },
  { key: "netSalary", label: "Net Salary", type: "number", section: "deductions", calculated: true },

  { key: "companyEpf12", label: "Company EPF (12%)", type: "number", section: "employer", calculated: true },
  { key: "etf3", label: "ETF 3%", type: "number", section: "employer", calculated: true },
  { key: "costToCompany", label: "Cost to Company", type: "number", section: "employer", calculated: true },

  { key: "bankName", label: "Bank Name", type: "text", section: "banking", editable: true },
  { key: "bankAccountNo", label: "Bank Account No", type: "text", section: "banking", editable: true },
];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round(n * 100) / 100;

// Client-side mirror of the backend calc, used for live preview in the form.
export function calculatePayroll(input) {
  const basicSalary = num(input.basicSalary);
  const operationalAllowance = num(input.operationalAllowance);
  const attendanceAllowance = num(input.attendanceAllowance);
  const targetAllowance = num(input.targetAllowance);
  const nopayAmount = num(input.nopayAmount);
  const otPay = num(input.otPay);
  const apit = num(input.apit);
  const deductions = num(input.deductions);

  const adjustedBasic = round2(basicSalary - nopayAmount);
  const totalOtPay = round2(otPay);
  const grossSalary = round2(adjustedBasic + operationalAllowance + attendanceAllowance + targetAllowance + totalOtPay);
  const employeeEpf8 = round2(adjustedBasic * 0.08);
  const companyEpf12 = round2(adjustedBasic * 0.12);
  const etf3 = round2(adjustedBasic * 0.03);
  const netSalary = round2(grossSalary - employeeEpf8 - apit - deductions);
  const costToCompany = round2(grossSalary + companyEpf12 + etf3);

  return {
    ...input,
    adjustedBasic,
    totalOtPay,
    grossSalary,
    employeeEpf8,
    companyEpf12,
    etf3,
    netSalary,
    costToCompany,
  };
}

export const money = (n) =>
  "Rs. " + Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
