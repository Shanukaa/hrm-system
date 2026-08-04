import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import { getLogs } from "../api/client.js";

const ACTION_LABELS = {
  login: "Logged in",
  login_failed: "Failed login attempt",
  logout: "Logged out",
  employee_created: "Created employee",
  employee_updated: "Updated employee",
  employee_deleted: "Deleted employee",
  employees_imported: "Imported employees",
  payslip_generated: "Generated payslip",
  user_created: "Created user",
  user_updated: "Updated user",
  user_deleted: "Deleted user",
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getLogs(1000)
      .then(setLogs)
      .catch((err) => setError(err.response?.data?.error || "Could not load activity log."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return logs;
    const q = query.toLowerCase();
    return logs.filter(
      (l) =>
        l.userEmail?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q)
    );
  }, [logs, query]);

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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-md text-sm border border-line rounded-md px-3.5 py-2.5 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <p className="text-xs text-muted whitespace-nowrap">
            {filtered.length} of {logs.length} entries
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Loading activity…</div>
        ) : (
          <div className="bg-surface border border-line rounded-lg overflow-hidden">
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
                {filtered.map((l, i) => (
                  <tr key={i} className="border-b border-line last:border-0 align-top">
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                      {l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink">{l.userEmail || "—"}</td>
                    <td className="px-4 py-3 text-muted text-xs">{l.userRole || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          l.action === "login_failed"
                            ? "bg-alertSoft text-alert"
                            : "bg-accentSoft text-accent"
                        }`}
                      >
                        {ACTION_LABELS[l.action] || l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{l.details || "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
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
      </div>
    </>
  );
}
