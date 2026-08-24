import { useEffect, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getEmployee,
  getLeaveProfile,
  getLeaveBalance,
  getMyLeaveRequests,
  getLeaveNotifications,
  ackLeaveRequest,
  createLeaveRequest,
  previewLeaveDays,
} from "../api/client.js";

const STATUS_STYLES = {
  pending: "bg-accentSoft text-accent",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-alertSoft text-alert",
};

const SCHEME_LABEL = { monthly: "this month", annual: "this leave year" };

const EMPLOYMENT_LABEL = {
  probation: "Probation",
  permanent_under_year: "Permanent (under 1 year)",
  permanent_over_year: "Permanent (over 1 year)",
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const empNo = user?.empNo;

  const [employee, setEmployee] = useState(null);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [previewDays, setPreviewDays] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  async function loadAll() {
    if (!empNo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [emp, prof, bal, mine, notes] = await Promise.all([
        getEmployee(empNo),
        getLeaveProfile(empNo),
        getLeaveBalance(),
        getMyLeaveRequests(),
        getLeaveNotifications(),
      ]);
      setEmployee(emp);
      setProfile(prof);
      setBalance(bal);
      setRequests(mine);
      setNotifications(notes);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empNo]);

  useEffect(() => {
    if (!form.startDate || !form.endDate) {
      setPreviewDays(null);
      return;
    }
    if (form.endDate < form.startDate) {
      setPreviewDays(null);
      return;
    }
    previewLeaveDays(form.startDate, form.endDate)
      .then((r) => setPreviewDays(r.days))
      .catch(() => setPreviewDays(null));
  }, [form.startDate, form.endDate]);

  async function dismissNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await ackLeaveRequest(id);
    } catch {
      // non-critical
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!form.startDate || !form.endDate) {
      setFormError("Please choose a start and end date.");
      return;
    }
    setSubmitting(true);
    try {
      await createLeaveRequest(form);
      setFormSuccess("Your leave request has been submitted and is waiting for approval.");
      setForm({ startDate: "", endDate: "", reason: "" });
      setPreviewDays(null);
      loadAll();
    } catch (err) {
      setFormError(err?.response?.data?.error || "Could not submit your leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!empNo) {
    return (
      <>
        <Topbar title="My Dashboard" />
        <div className="p-6 sm:p-8">
          <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">
            Your account isn't linked to an employee record yet. Please contact HR.
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Topbar title="My Dashboard" />
        <div className="p-6 sm:p-8 text-sm text-muted">Loading your dashboard…</div>
      </>
    );
  }

  const overBalance = balance && !balance.needsSetup && balance.remaining <= 0;
  const wouldExceed =
    balance && !balance.needsSetup && previewDays !== null && previewDays > balance.remaining;

  return (
    <>
      <Topbar title={`Welcome, ${employee?.employeeName?.split(" ")[0] || "there"}`} subtitle="Your profile, leave balance and requests" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {error && (
          <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">{error}</div>
        )}

        {/* Notifications: leave decisions not yet seen */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-md border px-4 py-3 text-sm flex items-start justify-between gap-4 ${
                  n.status === "approved" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-alert/40 bg-alertSoft text-alert"
                }`}
              >
                <div>
                  <p className="font-medium">
                    {n.status === "approved" ? "Your leave is confirmed" : "Your leave request was rejected"}
                  </p>
                  <p className="mt-0.5 text-xs opacity-80">
                    {n.startDate} → {n.endDate} ({n.days} day{n.days === 1 ? "" : "s"})
                    {n.status === "approved" && n.noPayDays > 0 && ` — ${n.noPayDays} day(s) will be no-pay`}
                  </p>
                  {n.status === "rejected" && n.reviewNote && (
                    <p className="mt-1 text-xs italic">Reason: {n.reviewNote}</p>
                  )}
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="text-xs font-medium underline decoration-dotted shrink-0"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Profile card */}
        <div className="bg-surface border border-line rounded-lg p-5 sm:p-6">
          <h3 className="font-display text-base text-ink mb-4">My Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <ProfileRow label="Name" value={employee?.employeeName} />
            <ProfileRow label="EMP No" value={employee?.empNo} />
            <ProfileRow label="Designation" value={employee?.designation} />
            <ProfileRow label="Cost Centre" value={employee?.costCentre} />
            <ProfileRow label="NIC No" value={employee?.nicNo} />
            <ProfileRow label="EPF No" value={employee?.epfNo} />
            <ProfileRow label="Join Date" value={profile?.joinDate || "Not set"} />
            <ProfileRow label="Employment Type" value={profile?.employmentType === "permanent" ? "Permanent" : "Probation"} />
          </div>
        </div>

        {/* Leave balance */}
        <div className="bg-surface border border-line rounded-lg p-5 sm:p-6">
          <h3 className="font-display text-base text-ink mb-4">Leave Balance</h3>
          {balance?.needsSetup ? (
            <p className="text-sm text-muted">
              Your leave profile hasn't been set up yet. Please contact HR to record your join date and employment
              type before requesting leave.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MiniStat label="Entitled" value={balance.quota} />
                <MiniStat label="Used" value={balance.used} />
                <MiniStat label="Remaining" value={balance.remaining} accent={!overBalance} alert={overBalance} />
                <MiniStat label="Pending" value={balance.pendingDays} />
              </div>
              <p className="text-xs text-muted mt-3">
                {EMPLOYMENT_LABEL[balance.stage] || balance.stage} · {balance.scheme === "annual" ? "Annual allowance" : "Monthly allowance"}{" "}
                {SCHEME_LABEL[balance.scheme]} ({balance.periodStart} to {balance.periodEnd})
              </p>
              {overBalance && (
                <div className="mt-4 border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">
                  Your available leave count is over for {SCHEME_LABEL[balance.scheme]}. Any further leave you take
                  will be recorded as no-pay.
                </div>
              )}
            </>
          )}
        </div>

        {/* Request form */}
        {!balance?.needsSetup && (
          <div className="bg-surface border border-line rounded-lg p-5 sm:p-6">
            <h3 className="font-display text-base text-ink mb-4">Request Leave</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-medium text-muted">Start date</span>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1 w-full text-sm border border-line rounded-md px-3 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted">End date</span>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="mt-1 w-full text-sm border border-line rounded-md px-3 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-muted">Reason</span>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="mt-1 w-full text-sm border border-line rounded-md px-3 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Briefly tell your manager why you're requesting leave"
                />
              </label>

              {previewDays !== null && (
                <p className="text-xs text-muted">
                  This covers <span className="font-medium text-ink">{previewDays}</span> working day
                  {previewDays === 1 ? "" : "s"}.{" "}
                  {wouldExceed && (
                    <span className="text-alert font-medium">
                      Only {balance.remaining} day{balance.remaining === 1 ? "" : "s"} remain — the rest will be
                      recorded as no-pay if approved.
                    </span>
                  )}
                </p>
              )}

              {formError && (
                <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm rounded-md px-3.5 py-2.5">
                  {formSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto text-sm font-medium px-5 py-2.5 rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-60 transition-colors"
              >
                {submitting ? "Submitting…" : "Submit Leave Request"}
              </button>
            </form>
          </div>
        )}

        {/* History */}
        <div className="bg-surface border border-line rounded-lg overflow-hidden">
          <h3 className="font-display text-base text-ink px-5 sm:px-6 pt-5 sm:pt-6 pb-4">My Leave Requests</h3>

          {requests.length === 0 ? (
            <p className="px-5 sm:px-6 pb-6 text-sm text-muted">No leave requests yet.</p>
          ) : (
            <>
              {/* Desktop table */}
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
                        {r.status === "approved" && r.noPayDays > 0 && (
                          <span className="block text-[11px] text-alert">{r.noPayDays} no-pay</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted max-w-xs">{r.reason || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted max-w-xs">{r.reviewNote || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-line border-t border-line">
                {requests.map((r) => (
                  <div key={r.id} className="px-5 py-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-ink">
                        {r.startDate} → {r.endDate}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[r.status]}`}>
                        {r.status}
                      </span>
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
      </div>
    </>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted font-medium">{label}</p>
      <p className="text-ink mt-0.5">{value || "—"}</p>
    </div>
  );
}

function MiniStat({ label, value, accent, alert }) {
  return (
    <div className="bg-paper rounded-md px-3 py-3 text-center">
      <p className={`font-mono text-xl ${alert ? "text-alert" : accent ? "text-accent" : "text-ink"}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted mt-1">{label}</p>
    </div>
  );
}
