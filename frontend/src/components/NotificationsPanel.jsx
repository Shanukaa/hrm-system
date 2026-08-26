import { useEffect, useState } from "react";
import { getNotifications, createAnnouncement, deleteAnnouncement, ackLeaveRequest } from "../api/client.js";

/**
 * Shared notifications feed: management/department announcements, birthday
 * shout-outs (auto-expire after ~2 days server-side), and — for
 * employee/manager viewers — their own leave decision notices.
 */
export default function NotificationsPanel({ canPostGlobal, canPostDepartment, userEmail }) {
  const [data, setData] = useState({ announcements: [], birthdays: [], leaveDecisions: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", scope: canPostGlobal ? "global" : "department" });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setData(await getNotifications());
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePost(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Please give the announcement a title.");
      return;
    }
    setPosting(true);
    try {
      await createAnnouncement(form);
      setForm({ title: "", body: "", scope: canPostGlobal ? "global" : "department" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not post the announcement.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteAnnouncement(id) {
    setData((prev) => ({ ...prev, announcements: prev.announcements.filter((a) => a.id !== id) }));
    try {
      await deleteAnnouncement(id);
    } catch {
      load();
    }
  }

  async function handleDismissLeave(id) {
    setData((prev) => ({ ...prev, leaveDecisions: prev.leaveDecisions.filter((n) => n.id !== id) }));
    try {
      await ackLeaveRequest(id);
    } catch {
      // non-critical
    }
  }

  const nothingToShow =
    !loading && data.announcements.length === 0 && data.birthdays.length === 0 && data.leaveDecisions.length === 0;

  return (
    <div className="space-y-3">
      {(canPostGlobal || canPostDepartment) && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm font-medium px-4 py-2 rounded-xl bg-ink text-white shadow-soft hover:bg-ink/90 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200"
            >
              + Post Announcement
            </button>
          ) : (
            <form onSubmit={handlePost} className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-4 space-y-3">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full text-sm border border-line rounded-xl px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <textarea
                rows={3}
                placeholder="Message"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full text-sm border border-line rounded-xl px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              {canPostGlobal && canPostDepartment && (
                <select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  className="text-sm border border-line rounded-xl px-3 py-2 bg-paper"
                >
                  <option value="global">Company-wide</option>
                  <option value="department">My department only</option>
                </select>
              )}
              {!canPostGlobal && <p className="text-xs text-muted">This will only be visible to your department.</p>}
              {canPostGlobal && !canPostDepartment && <p className="text-xs text-muted">This will be visible company-wide.</p>}
              {error && <div className="text-sm text-alert">{error}</div>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={posting}
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-accent text-white shadow-soft hover:bg-accentDark hover:shadow-card hover:-translate-y-0.5 disabled:opacity-60 transition-all duration-200"
                >
                  {posting ? "Posting…" : "Post"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm font-medium px-4 py-2 rounded-md border border-line text-muted hover:text-ink transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Loading notifications…</p>}
      {nothingToShow && <p className="text-sm text-muted">No notifications right now.</p>}

      {data.birthdays.map((b) => (
        <div key={`bday-${b.empNo}`} className="rounded-md border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
          🎂 {b.isToday ? "Today" : "Yesterday"} is <span className="font-medium">{b.employeeName}</span>'s birthday!
        </div>
      ))}

      {data.leaveDecisions.map((n) => (
        <div
          key={`leave-${n.id}`}
          className={`rounded-md border px-4 py-3 text-sm flex items-start justify-between gap-4 ${
            n.status === "approved" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-alert/40 bg-alertSoft text-alert"
          }`}
        >
          <div>
            <p className="font-medium">{n.status === "approved" ? "Your leave is confirmed" : "Your leave request was rejected"}</p>
            <p className="mt-0.5 text-xs opacity-80">
              {n.startDate} → {n.endDate} ({n.days} day{n.days === 1 ? "" : "s"})
              {n.status === "approved" && n.noPayDays > 0 && ` — ${n.noPayDays} day(s) will be no-pay`}
            </p>
            {n.status === "rejected" && n.reviewNote && <p className="mt-1 text-xs italic">Reason: {n.reviewNote}</p>}
          </div>
          <button onClick={() => handleDismissLeave(n.id)} className="text-xs font-medium underline decoration-dotted shrink-0">
            Dismiss
          </button>
        </div>
      ))}

      {data.announcements.map((a) => (
        <div key={`ann-${a.id}`} className="rounded-md border border-line bg-surface px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-ink">
                {a.title}
                {a.scope === "department" && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide bg-paper border border-line px-1.5 py-0.5 rounded text-muted">
                    Department
                  </span>
                )}
              </p>
              {a.body && <p className="text-muted mt-1 whitespace-pre-wrap">{a.body}</p>}
              <p className="text-[11px] text-muted mt-1.5">
                {a.createdByName} · {new Date(a.createdAt).toLocaleDateString()}
              </p>
            </div>
            {a.createdBy === userEmail && (
              <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-xs text-muted hover:text-alert shrink-0">
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
