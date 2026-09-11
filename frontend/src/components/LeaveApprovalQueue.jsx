import { useEffect, useState } from "react";
import { getAllLeaveRequestsPaged, decideLeaveRequest } from "../api/client.js";
import { useServerPagination } from "../hooks/useServerPagination.js";
import Pagination from "./Pagination.jsx";

const STATUS_STYLES = {
  pending: "bg-accentSoft text-accent",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-alertSoft text-alert",
  cancelled: "bg-paper text-muted",
};

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "all", label: "All Requests" },
];

/** The leave approval queue. `filterEmpNos`, if given, restricts the list to a specific set of employees (e.g. a manager's department). */
export default function LeaveApprovalQueue({ filterEmpNos }) {
  const [tab, setTab] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [capacityPopup, setCapacityPopup] = useState(null);
  const [noPayPopup, setNoPayPopup] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const {
    items: requests,
    total,
    page,
    setPage,
    totalPages,
    pageSize,
    loading,
    error,
    reload,
  } = useServerPagination(getAllLeaveRequestsPaged, {
    pageSize: 8,
    extraParams: { status: tab === "pending" ? "pending" : undefined, empNos: filterEmpNos },
  });

  async function refreshPendingCount() {
    try {
      const result = await getAllLeaveRequestsPaged({ status: "pending", page: 1, pageSize: 1, empNos: filterEmpNos });
      setPendingCount(result.total);
    } catch {
      // non-critical — the badge just won't update
    }
  }

  useEffect(() => {
    refreshPendingCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEmpNos ? filterEmpNos.join(",") : ""]);

  async function handleApprove(id) {
    setBusyId(id);
    try {
      const result = await decideLeaveRequest(id, "approved", "");
      if (result.capacityWarning?.exceeds) setCapacityPopup(result.capacityWarning);
      if (result.noPayApplied) setNoPayPopup({ empNo: result.empNo, employeeName: result.employeeName, ...result.noPayApplied });
      reload();
      refreshPendingCount();
    } catch (err) {
      alert(err?.response?.data?.error || "Could not approve this request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    if (!rejectNote.trim()) return;
    setBusyId(id);
    try {
      await decideLeaveRequest(id, "rejected", rejectNote.trim());
      setRejectingId(null);
      setRejectNote("");
      reload();
      refreshPendingCount();
    } catch (err) {
      alert(err?.response?.data?.error || "Could not reject this request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {error && <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">{error}</div>}

      <div className="flex items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm font-medium px-4 py-2 rounded-md border transition-all duration-200 ${
              tab === t.key ? "bg-ink text-white border-ink" : "border-line text-muted hover:text-ink"
            }`}
          >
            {t.label}
            {t.key === "pending" && pendingCount > 0 && tab !== "pending" && <span className="ml-1.5 text-xs">({pendingCount})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted text-sm">Loading leave requests…</div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center text-muted text-sm">
          {tab === "pending" ? "No pending leave requests." : "No leave requests yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {r.employeeName} <span className="text-muted font-normal">({r.empNo})</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {r.startDate} → {r.endDate} · {r.days} day{r.days === 1 ? "" : "s"}
                  </p>
                  {r.reason && <p className="text-sm text-ink mt-2">{r.reason}</p>}
                  <p className="text-[11px] text-muted mt-2">Requested {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : ""}</p>
                  {r.status !== "pending" && (
                    <div className="mt-2 text-xs text-muted">
                      {r.status === "approved" && (
                        <span>
                          Paid: {r.paidDays} {r.noPayDays > 0 && <span className="text-alert">· No-pay: {r.noPayDays}</span>}
                        </span>
                      )}
                      {r.reviewNote && <p className="italic mt-0.5">Note: {r.reviewNote}</p>}
                      {r.reviewerName && (
                        <p className="mt-0.5">
                          By {r.reviewerName} on {r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full capitalize shrink-0 ${STATUS_STYLES[r.status]}`}>{r.status}</span>
              </div>

              {r.status === "pending" && (
                <div className="mt-4 pt-4 border-t border-line">
                  {rejectingId === r.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Reason for rejecting (required)"
                        className="w-full text-sm border border-line rounded-xl px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(r.id)}
                          disabled={busyId === r.id || !rejectNote.trim()}
                          className="text-sm font-medium px-4 py-2 rounded-md bg-alert text-white hover:bg-alert/90 disabled:opacity-50 transition-all duration-200"
                        >
                          {busyId === r.id ? "Rejecting…" : "Confirm Rejection"}
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectNote("");
                          }}
                          className="text-sm font-medium px-4 py-2 rounded-md border border-line text-muted hover:text-ink transition-all duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={busyId === r.id}
                        className="text-sm font-medium px-4 py-2 rounded-xl bg-accent text-white shadow-soft hover:bg-accentDark hover:shadow-card hover:-translate-y-0.5 disabled:opacity-50 transition-all duration-200"
                      >
                        {busyId === r.id ? "Approving…" : "Approve"}
                      </button>
                      <button
                        onClick={() => setRejectingId(r.id)}
                        disabled={busyId === r.id}
                        className="text-sm font-medium px-4 py-2 rounded-md border border-alert/40 text-alert hover:bg-alertSoft transition-all duration-200"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && requests.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={pageSize} />
      )}

      {capacityPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-surface rounded-lg max-w-sm w-full p-5 space-y-3">
            <h4 className="font-display text-base text-ink">Department leave capacity notice</h4>
            <p className="text-sm text-muted">
              On {capacityPopup.worstDay}, {capacityPopup.worstCount} people from this department will now be on
              leave — above the department's maximum of {capacityPopup.max}. The request has still been approved.
            </p>
            <button
              onClick={() => setCapacityPopup(null)}
              className="w-full text-sm font-medium px-4 py-2 rounded-xl bg-ink text-white shadow-soft hover:bg-ink/90 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {noPayPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-surface rounded-lg max-w-sm w-full p-5 space-y-3">
            <h4 className="font-display text-base text-ink">No-pay deduction added to payroll</h4>
            <p className="text-sm text-muted">
              {noPayPopup.employeeName || noPayPopup.empNo} had days beyond their leave balance on this request. Rs.{" "}
              {noPayPopup.deduction.toLocaleString()} (at Rs. {noPayPopup.dailyRate.toLocaleString()}/day) has been
              automatically added to their no-pay amount — new total: Rs. {noPayPopup.newNopayAmount.toLocaleString()}.
              This carries forward on their payroll record until reset for the next pay cycle.
            </p>
            <button
              onClick={() => setNoPayPopup(null)}
              className="w-full text-sm font-medium px-4 py-2 rounded-xl bg-ink text-white shadow-soft hover:bg-ink/90 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
