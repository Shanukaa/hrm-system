import { useEffect, useState } from "react";
import { createLeaveRequest, previewLeaveDays } from "../api/client.js";

export default function RequestLeaveForm({ balance, onSubmitted }) {
  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [previewDays, setPreviewDays] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [capacityPopup, setCapacityPopup] = useState(null);

  useEffect(() => {
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      setPreviewDays(null);
      return;
    }
    previewLeaveDays(form.startDate, form.endDate)
      .then((r) => setPreviewDays(r.days))
      .catch(() => setPreviewDays(null));
  }, [form.startDate, form.endDate]);

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
      const result = await createLeaveRequest(form);
      setFormSuccess("Your leave request has been submitted and is waiting for approval.");
      setForm({ startDate: "", endDate: "", reason: "" });
      setPreviewDays(null);
      if (result.capacityWarning?.exceeds) setCapacityPopup(result.capacityWarning);
      onSubmitted?.();
    } catch (err) {
      setFormError(err?.response?.data?.error || "Could not submit your leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  const wouldExceed = balance && !balance.needsSetup && previewDays !== null && previewDays > balance.remaining;

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-5 sm:p-6">
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
              className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
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
              className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-muted">Reason</span>
          <textarea
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2.5 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            placeholder="Briefly explain why you're requesting leave"
          />
        </label>

        {previewDays !== null && (
          <p className="text-xs text-muted">
            This covers <span className="font-medium text-ink">{previewDays}</span> working day{previewDays === 1 ? "" : "s"}.{" "}
            {wouldExceed && (
              <span className="text-alert font-medium">
                Only {balance.remaining} day{balance.remaining === 1 ? "" : "s"} remain — the rest will be recorded as no-pay if approved.
              </span>
            )}
          </p>
        )}

        {formError && <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">{formError}</div>}
        {formSuccess && (
          <div className="border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm rounded-md px-3.5 py-2.5">{formSuccess}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto text-sm font-medium px-5 py-2.5 rounded-xl bg-accent text-white shadow-soft hover:bg-accentDark hover:shadow-card hover:-translate-y-0.5 disabled:opacity-60 transition-all duration-200"
        >
          {submitting ? "Submitting…" : "Submit Leave Request"}
        </button>
      </form>

      {capacityPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-surface rounded-lg max-w-sm w-full p-5 space-y-3">
            <h4 className="font-display text-base text-ink">Department leave capacity notice</h4>
            <p className="text-sm text-muted">
              On {capacityPopup.worstDay}, {capacityPopup.worstCount} people from your department would be on leave —
              above the department's maximum of {capacityPopup.max}. Your request has still been submitted; your
              manager will see this too when deciding.
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
    </div>
  );
}
