/**
 * Single source of truth for the payroll table shape.
 * `header` must match the exact text in row 1 of your Google Sheet.
 * `key` is the field name used everywhere in the API/JSON/frontend.
 * `type` drives parsing/formatting and whether a field is auto-calculated.
 *
 * IMPORTANT: if your sheet's header row differs from this, edit `header`
 * values below to match — do not rename `key`.
 */
export const COLUMNS = [
  { key: "empNo", header: "EMP NO", type: "text", editable: true },
  { key: "epfNo", header: "EPF No", type: "text", editable: true },
  { key: "employeeName", header: "Employee Name", type: "text", editable: true },
  { key: "nicNo", header: "NIC NO", type: "text", editable: true },
  { key: "designation", header: "Designation", type: "text", editable: true },
  { key: "costCentre", header: "Cost Centre", type: "text", editable: true },
  { key: "basicSalary", header: "Basic Salary", type: "number", editable: true },
  { key: "operationalAllowance", header: "Operational Allowance", type: "number", editable: true },
  { key: "attendanceAllowance", header: "Attendence Allowance", type: "number", editable: true },
  { key: "targetAllowance", header: "Traget Allowance", type: "number", editable: true },
  { key: "nopayAmount", header: "Nopay Amount", type: "number", editable: true },
  { key: "adjustedBasic", header: "Adjusted Basic", type: "number", calculated: true },
  { key: "otPay", header: "OT Pay", type: "number", editable: true, group: "OT Pay" },
  { key: "totalOtPay", header: "Total OT Pay", type: "number", calculated: true, group: "OT Pay" },
  { key: "grossSalary", header: "Gross Salary", type: "number", calculated: true },
  { key: "employeeEpf8", header: "Employee EPF (8%)", type: "number", calculated: true },
  { key: "companyEpf12", header: "EPF 12%", type: "number", calculated: true, group: "Company Contribution" },
  { key: "etf3", header: "ETF 3%", type: "number", calculated: true, group: "Company Contribution" },
  { key: "apit", header: "Apit", type: "number", editable: true },
  { key: "deductions", header: "Deductions", type: "number", editable: true },
  { key: "netSalary", header: "Net Salary", type: "number", calculated: true },
  { key: "costToCompany", header: "Cost to company", type: "number", calculated: true },
  { key: "bankName", header: "Bank Name", type: "text", editable: true },
  { key: "bankAccountNo", header: "Bank Account No", type: "text", editable: true },
];

export const HEADERS = COLUMNS.map((c) => c.header);
export const KEYS = COLUMNS.map((c) => c.key);
// Row-1 group labels aligned to each column, blank where a column has no group
// (used only to auto-write a group-label row when HEADER_ROW is 2+).
export const GROUP_HEADERS = COLUMNS.map((c) => c.group || "");

export function rowArrayToObject(row) {
  const obj = {};
  COLUMNS.forEach((col, i) => {
    obj[col.key] = row[i] ?? "";
  });
  return obj;
}

export function objectToRowArray(obj) {
  return COLUMNS.map((col) => (obj[col.key] ?? "").toString());
}
