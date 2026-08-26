const STATUS_STYLES = {
  pending: "bg-accentSoft text-accent",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-alertSoft text-alert",
};

/** Shows the last N months (default 3) of an employee/manager's own leave requests. */
export default function MyLeaveHistory({ requests }) {
  return (
    <div className="bg-surface border border-line rounded-lg overflow-hidden">
      <h3 className="font-display text-base text-ink px-5 sm:px-6 pt-5 sm:pt-6 pb-4">My Leave Requests (last 3 months)</h3>

      {requests.length === 0 ? (
        <p className="px-5 sm:px-6 pb-6 text-sm text-muted">No leave requests in the last 3 months.</p>
      ) : (
        <>
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-t border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Days</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-6 py-3 text-ink whitespace-nowrap">
                    {r.startDate} → {r.endDate}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {r.days}
                    {r.status === "approved" && r.noPayDays > 0 && <span className="block text-[11px] text-alert">{r.noPayDays} no-pay</span>}
                  </td>
                  <td className="px-4 py-3 text-muted max-w-xs">{r.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-6 py-3 text-muted max-w-xs">{r.reviewNote || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden divide-y divide-line border-t border-line">
            {requests.map((r) => (
              <div key={r.id} className="px-5 py-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">
                    {r.startDate} → {r.endDate}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </div>
                <p className="text-xs text-muted">
                  {r.days} day{r.days === 1 ? "" : "s"}
                  {r.status === "approved" && r.noPayDays > 0 && ` (${r.noPayDays} no-pay)`}
                </p>
                {r.reason && <p className="text-xs text-muted">Reason: {r.reason}</p>}
                {r.reviewNote && <p className="text-xs text-muted italic">Note: {r.reviewNote}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
