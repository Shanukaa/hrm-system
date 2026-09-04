import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import StatCard from "../components/StatCard.jsx";
import EmployeeTable from "../components/EmployeeTable.jsx";
import Pagination from "../components/Pagination.jsx";
import { useServerPagination } from "../hooks/useServerPagination.js";
import {
  getEmployeesPaged,
  getDashboardSummary,
  deleteEmployee,
  downloadPayslip,
  downloadAllPayslips,
} from "../api/client.js";
import { money } from "../api/fields.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const canSeeLeaves = ["admin", "hr_manager"].includes(user?.role);
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [selected, setSelected] = useState(new Set());

  const { items: employees, total, page, setPage, totalPages, pageSize, search, setSearch, loading, error } =
    useServerPagination(getEmployeesPaged, { pageSize: 12 });

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch(() =>
        setSummaryError(
          "Could not reach the backend API. Make sure the server is running and the database is reachable."
        )
      );
  }, []);

  const toggleSelect = (empNo) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(empNo) ? next.delete(empNo) : next.add(empNo);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (employees.every((e) => prev.has(e.empNo))) return new Set();
      return new Set([...prev, ...employees.map((e) => e.empNo)]);
    });
  };

  const handleDelete = async (empNo) => {
    if (!confirm(`Delete employee ${empNo}? This also cancels their pending leave, unassigns them as a department manager if applicable, and deactivates any linked login.`))
      return;
    await deleteEmployee(empNo);
    setPage(1);
  };

  const handleBulkPayslips = async () => {
    const empNos = selected.size > 0 ? [...selected] : undefined;
    await downloadAllPayslips(undefined, empNos, "simple");
  };

  return (
    <>
      <Topbar
        title="Payroll Dashboard"
        subtitle="Live view of your employee records, ready for review and payslip generation"
        actions={
          <>
            <button
              onClick={handleBulkPayslips}
              className="text-sm font-medium px-4 py-2 rounded-md border border-line hover:border-accent hover:text-accent transition-all duration-200"
            >
              {selected.size > 0 ? `Download ${selected.size} Payslip(s)` : "Download All Payslips"}
            </button>
            <Link
              to="/employees/new"
              className="text-sm font-medium px-4 py-2 rounded-xl bg-accent text-white shadow-soft hover:bg-accentDark hover:shadow-card hover:-translate-y-0.5 transition-all duration-200"
            >
              + Add Employee
            </Link>
          </>
        }
      />

      <div className="p-8 space-y-6">
        {(error || summaryError) && (
          <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">
            {error || summaryError}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms]">
            <StatCard label="Employees" value={summary.employeeCount} />
            <StatCard label="Total Gross Salary" value={money(summary.totalGrossSalary)} />
            <StatCard label="Total Net Salary" value={money(summary.totalNetSalary)} accent />
            <StatCard label="Total Cost to Company" value={money(summary.totalCostToCompany)} />
            {canSeeLeaves && (
              <Link to="/leaves" className="block">
                <StatCard label="Pending Leave Requests" value={summary.pendingLeaveRequests ?? 0} accent={summary.pendingLeaveRequests > 0} />
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search by name, EMP no, designation, cost centre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md text-sm border border-line rounded-xl px-3.5 py-2.5 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <p className="text-xs text-muted whitespace-nowrap">{total} employee{total === 1 ? "" : "s"}</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Loading payroll ledger…</div>
        ) : (
          <>
            <EmployeeTable
              employees={employees}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onDelete={handleDelete}
              onDownloadPayslip={(empNo) => downloadPayslip(empNo)}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={pageSize} />
          </>
        )}
      </div>
    </>
  );
}
