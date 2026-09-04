import Topbar from "../components/Topbar.jsx";
import Pagination from "../components/Pagination.jsx";
import { useServerPagination } from "../hooks/useServerPagination.js";
import { getLogsPaged } from "../api/client.js";

const ACTION_LABELS = {
  login: "Logged in",
  login_failed: "Failed login attempt",
  login_blocked: "Login blocked (account locked)",
  logout: "Logged out",
  employee_created: "Created employee",
  employee_updated: "Updated employee",
  employee_deleted: "Deleted employee",
  employees_imported: "Imported employees",
  payslip_generated: "Generated payslip",
  payslip_bulk_generated: "Bulk-generated payslips",
  payslip_snapshot_unlocked: "Unlocked a locked payslip",
  user_created: "Created user",
  user_updated: "Updated user",
  user_deleted: "Deleted user",
  leave_requested: "Requested leave",
  leave_approved: "Approved leave",
  leave_rejected: "Rejected leave",
  leave_withdrawn: "Withdrew leave request",
  leave_profile_updated: "Updated leave profile",
  department_created: "Created department",
  department_updated: "Updated department",
  department_deleted: "Deleted department",
};

const WARN_ACTIONS = new Set(["login_failed", "login_blocked", "employee_deleted", "user_deleted", "department_deleted"]);

export default function Logs() {
  const { items: logs, total, page, setPage, totalPages, pageSize, search, setSearch, loading, error } =
    useServerPagination(getLogsPaged, { pageSize: 20 });

  return (
    <>
      <Topbar title="Activity Log" subtitle="Audit trail of logins and changes made across the system" />

      <div className="p-8 space-y-6">
        {error && (
          <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">{error}</div>
        )}

        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search by user, action, or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md text-sm border border-line rounded-xl px-3.5 py-2.5 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <p className="text-xs text-muted whitespace-nowrap">{total} entr{total === 1 ? "y" : "ies"}</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Loading activity…</div>
        ) : (
          <div className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-b border-line last:border-0 align-top">
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                      {l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink">{l.userEmail || "—"}</td>
                    <td className="px-4 py-3 text-muted text-xs">{l.userRole || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          WARN_ACTIONS.has(l.action) ? "bg-alertSoft text-alert" : "bg-accentSoft text-accent"
                        }`}
                      >
                        {ACTION_LABELS[l.action] || l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{l.details || "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                      No activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={pageSize} />}
      </div>
    </>
  );
}
