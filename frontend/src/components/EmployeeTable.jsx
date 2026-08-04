import { Link } from "react-router-dom";
import { money } from "../api/fields";
import { useAuth } from "../context/AuthContext.jsx";

export default function EmployeeTable({
  employees,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  onDownloadPayslip,
}) {
  const { user } = useAuth();
  const canDelete = user?.role === "admin" || user?.role === "hr_manager";
  if (employees.length === 0) {
    return (
      <div className="border border-dashed border-line rounded-lg py-16 text-center bg-surface">
        <p className="text-ink font-medium">No employees yet</p>
        <p className="text-sm text-muted mt-1">
          Add one manually or import a CSV/Excel file to populate the ledger.
        </p>
      </div>
    );
  }

  const allSelected = employees.length > 0 && employees.every((e) => selected.has(e.empNo));

  return (
    <div className="border border-line rounded-lg bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-accentSoft/60 text-left text-[11px] uppercase tracking-wide text-ink/70">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
              </th>
              <th className="px-3 py-3 font-medium">Emp No</th>
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Designation</th>
              <th className="px-3 py-3 font-medium">Cost Centre</th>
              <th className="px-3 py-3 font-medium text-right">Gross Salary</th>
              <th className="px-3 py-3 font-medium text-right">Net Salary</th>
              <th className="px-3 py-3 font-medium text-right">Cost to Co.</th>
              <th className="px-3 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.empNo} className="border-t border-line hover:bg-paper/60 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(e.empNo)} onChange={() => onToggleSelect(e.empNo)} />
                </td>
                <td className="px-3 py-3 font-mono text-xs text-ink">{e.empNo}</td>
                <td className="px-3 py-3 font-medium text-ink">{e.employeeName}</td>
                <td className="px-3 py-3 text-muted">{e.designation || "—"}</td>
                <td className="px-3 py-3 text-muted">{e.costCentre || "—"}</td>
                <td className="px-3 py-3 text-right font-mono text-ink">{money(e.grossSalary)}</td>
                <td className="px-3 py-3 text-right font-mono text-accent font-medium">{money(e.netSalary)}</td>
                <td className="px-3 py-3 text-right font-mono text-muted">{money(e.costToCompany)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onDownloadPayslip(e.empNo)}
                      title="Download payslip"
                      className="text-xs px-2.5 py-1.5 rounded border border-line hover:border-accent hover:text-accent transition-colors"
                    >
                      Payslip
                    </button>
                    <Link
                      to={`/employees/${encodeURIComponent(e.empNo)}/edit`}
                      title="Edit"
                      className="text-xs px-2.5 py-1.5 rounded border border-line hover:border-accent hover:text-accent transition-colors"
                    >
                      Edit
                    </Link>
                    {canDelete && (
                      <button
                        onClick={() => onDelete(e.empNo)}
                        title="Delete"
                        className="text-xs px-2.5 py-1.5 rounded border border-line hover:border-alert hover:text-alert transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
