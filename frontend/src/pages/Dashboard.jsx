import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import StatCard from "../components/StatCard.jsx";
import EmployeeTable from "../components/EmployeeTable.jsx";
import {
  getEmployees,
  getDashboardSummary,
  deleteEmployee,
  downloadPayslip,
  downloadAllPayslips,
} from "../api/client.js";
import { money } from "../api/fields.js";

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [emp, sum] = await Promise.all([getEmployees(), getDashboardSummary()]);
      setEmployees(emp);
      setSummary(sum);
    } catch (err) {
      setError(
        "Could not reach the backend API. Make sure the server is running and the Google Sheet is shared with the service account."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return employees;
    const q = query.toLowerCase();
    return employees.filter(
      (e) =>
        e.employeeName?.toLowerCase().includes(q) ||
        e.empNo?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q) ||
        e.costCentre?.toLowerCase().includes(q)
    );
  }, [employees, query]);

  const toggleSelect = (empNo) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(empNo) ? next.delete(empNo) : next.add(empNo);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (filtered.every((e) => prev.has(e.empNo))) return new Set();
      return new Set(filtered.map((e) => e.empNo));
    });
  };

  const handleDelete = async (empNo) => {
    if (!confirm(`Delete employee ${empNo}? This removes the row from the Google Sheet.`)) return;
    await deleteEmployee(empNo);
    load();
  };

  const handleBulkPayslips = async () => {
    const empNos = selected.size > 0 ? [...selected] : undefined;
    await downloadAllPayslips(undefined, empNos);
  };

  return (
    <>
      <Topbar
        title="Payroll Dashboard"
        subtitle="Live view of your Google Sheet, ready for review and payslip generation"
        actions={
          <>
            <button
              onClick={handleBulkPayslips}
              className="text-sm font-medium px-4 py-2 rounded-md border border-line hover:border-accent hover:text-accent transition-colors"
            >
              {selected.size > 0 ? `Download ${selected.size} Payslip(s)` : "Download All Payslips"}
            </button>
            <Link
              to="/employees/new"
              className="text-sm font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              + Add Employee
            </Link>
          </>
        }
      />

      <div className="p-8 space-y-6">
        {error && (
          <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms]">
            <StatCard label="Employees" value={summary.employeeCount} />
            <StatCard label="Total Gross Salary" value={money(summary.totalGrossSalary)} />
            <StatCard label="Total Net Salary" value={money(summary.totalNetSalary)} accent />
            <StatCard label="Total Cost to Company" value={money(summary.totalCostToCompany)} />
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search by name, EMP no, designation, cost centre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-md text-sm border border-line rounded-md px-3.5 py-2.5 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <p className="text-xs text-muted whitespace-nowrap">
            {filtered.length} of {employees.length} employees
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Loading payroll ledger…</div>
        ) : (
          <EmployeeTable
            employees={filtered}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onDelete={handleDelete}
            onDownloadPayslip={(empNo) => downloadPayslip(empNo)}
          />
        )}
      </div>
    </>
  );
}
