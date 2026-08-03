/**
 * Payroll calculation engine.
 *
 * Formulas (standard Sri Lankan payroll structure):
 *   Adjusted Basic        = Basic Salary - Nopay Amount
 *   Total OT Pay           = OT Pay (pass-through; edit here if you later add an hours x rate model)
 *   Gross Salary            = Adjusted Basic + Operational Allowance + Attendance Allowance
 *                             + Target Allowance + Total OT Pay
 *   Employee EPF (8%)       = round(Adjusted Basic x 0.08)
 *   Company Contribution
 *     EPF 12%                = round(Adjusted Basic x 0.12)
 *   ETF 3%                  = round(Adjusted Basic x 0.03)
 *   Net Salary               = Gross Salary - Employee EPF (8%) - Apit - Deductions
 *   Cost to Company          = Gross Salary + Company Contribution EPF 12% + ETF 3%
 *
 * Apit (PAYE tax) and Deductions (loans/advances/etc.) are NOT auto-calculated —
 * Sri Lankan APIT depends on a tax table / employee tax status that varies per
 * person, so these stay as manual entries. Everything else auto-recalculates
 * whenever Basic Salary, allowances, Nopay, or OT Pay change, but every
 * calculated field can still be manually overridden in the form if needed.
 */

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round(n * 100) / 100;

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

  const grossSalary = round2(
    adjustedBasic + operationalAllowance + attendanceAllowance + targetAllowance + totalOtPay
  );

  const employeeEpf8 = round2(adjustedBasic * 0.08);
  const companyEpf12 = round2(adjustedBasic * 0.12);
  const etf3 = round2(adjustedBasic * 0.03);

  const netSalary = round2(grossSalary - employeeEpf8 - apit - deductions);
  const costToCompany = round2(grossSalary + companyEpf12 + etf3);

  return {
    ...input,
    basicSalary,
    operationalAllowance,
    attendanceAllowance,
    targetAllowance,
    nopayAmount,
    adjustedBasic,
    otPay,
    totalOtPay,
    grossSalary,
    employeeEpf8,
    companyEpf12,
    etf3,
    apit,
    deductions,
    netSalary,
    costToCompany,
  };
}
