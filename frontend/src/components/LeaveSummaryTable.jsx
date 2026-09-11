import { useEffect, useState } from "react";
import { getLeaveSummary } from "../api/client.js";

const SCHEME_LABEL = { monthly: "Monthly", annual: "Annual" };
const STAGE_LABEL = {
  probation: "Probation",
  permanent_under_year: "Permanent (< 1yr)",
  permanent_over_year: "Permanent (1yr+)",
};

/**
 * Per-employee leave overview: entitlement, what's been used this month and
 * year-to-date, and what's left — with anyone currently over their limit
 * flagged. `empNos`, if given, scopes this to a specific set of employees
 * (a manager's department); omit for the org-wide view.
 */
export default function LeaveSummaryTable({ empNos }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await getLeaveSummary(empNos));
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load the leave summary.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empNos ? empNos.join(",") : ""]);

  const filtered = search.trim()
    ? rows.filter((r) => r.employeeName?.toLowerCase().includes(search.trim().toLowerCase()) || r.empNo?.toLowerCase().includes(search.trim().toLowerCase()))
    : rows;

  const overLimitCount = rows.filter((r) => r.overLimit).length;

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
        <div>
          <h3 className="font-display text-base text-ink">Leave Summary</h3>
          <p className="text-xs text-muted mt-0.5">
            Entitlement, usage, and remaining balance for every employee.
            {overLimitCount > 0 && <span className="text-alert font-medium"> {overLimitCount} over their limit.</span>}
          </p>
        </div>
        <input
          type="text"
          placeholder="Search employee…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-line rounded-xl px-3.5 py-2 bg-paper w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
      </div>

      {error && <div className="mx-5 sm:mx-6 mb-4 border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">{error}</div>}

      {loading ? (
        <p className="px-5 sm:px-6 pb-6 text-sm text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="px-5 sm:px-6 pb-6 text-sm text-muted">No employees to show.</p>
      ) : (
        <>
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-t border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Scheme</th>
                <th className="px-4 py-3 font-medium text-right">This Month</th>
                <th className="px-4 py-3 font-medium text-right">Year to Date</th>
                <th className="px-4 py-3 font-medium text-right">Entitled</th>
                <th className="px-4 py-3 font-medium text-right">Remaining</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.empNo} className="border-b border-line last:border-0">
                  <td className="px-6 py-3">
                    <p className="text-ink font-medium">{r.employeeName}</p>
                    <p className="text-xs text-muted">{r.empNo}</p>
                  </td>
                  {r.needsSetup ? (
                    <td colSpan={5} className="px-4 py-3 text-xs text-muted italic">
                      Leave profile not set up yet
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-muted text-xs">
                        {SCHEME_LABEL[r.scheme]}
                        <span className="block text-[10px]">{STAGE_LABEL[r.stage]}</span>
                      </td>
                      <td className="px-4 py-3 text-ink text-right font-mono">{r.thisMonthUsed}</td>
                      <td className="px-4 py-3 text-ink text-right font-mono">{r.yearToDateUsed}</td>
                      <td className="px-4 py-3 text-muted text-right font-mono">{r.quota}</td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${r.overLimit ? "text-alert" : "text-ink"}`}>{r.remaining}</td>
                      <td className="px-6 py-3">
                        {r.overLimit ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-alertSoft text-alert">Over limit</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">OK</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-line border-t border-line">
            {filtered.map((r) => (
              <div key={r.empNo} className="px-5 py-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{r.employeeName}</p>
                    <p className="text-xs text-muted">{r.empNo}</p>
                  </div>
                  {!r.needsSetup &&
                    (r.overLimit ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-alertSoft text-alert">Over limit</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">OK</span>
                    ))}
                </div>
                {r.needsSetup ? (
                  <p className="text-xs text-muted italic">Leave profile not set up yet</p>
                ) : (
                  <p className="text-xs text-muted">
                    {SCHEME_LABEL[r.scheme]} · This month: <span className="text-ink">{r.thisMonthUsed}</span> · YTD:{" "}
                    <span className="text-ink">{r.yearToDateUsed}</span> · Entitled: {r.quota} · Remaining:{" "}
                    <span className={r.overLimit ? "text-alert font-medium" : "text-ink"}>{r.remaining}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
