import { useEffect, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import { getLeavePolicy, updateLeavePolicy, getHolidays, createHoliday, deleteHoliday } from "../api/client.js";

const POLICY_FIELDS = [
  { key: "probationMonthly", label: "Probation employees", suffix: "leaves / month" },
  { key: "permanentUnderYearMonthly", label: "Permanent, under 1 year", suffix: "leaves / month" },
  { key: "permanentOverYearMonthly", label: "Permanent, over 1 year (fallback until an annual allocation is set)", suffix: "leaves / month" },
  { key: "defaultAnnualLeaveDays", label: "Suggested annual allocation", suffix: "days / year" },
  { key: "qualifyingDays", label: "Days of service before \u201cover 1 year\u201d rules apply", suffix: "days" },
];

export default function LeaveSettings() {
  const [policy, setPolicy] = useState(null);
  const [policyForm, setPolicyForm] = useState({});
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySavedAt, setPolicySavedAt] = useState(null);
  const [policyError, setPolicyError] = useState("");

  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ date: "", name: "" });
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([getLeavePolicy(), getHolidays()]);
      setPolicy(p);
      setPolicyForm(p);
      setHolidays(h);
    } catch {
      // surfaced via the empty states below
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSavePolicy(e) {
    e.preventDefault();
    setPolicyError("");
    setSavingPolicy(true);
    try {
      const updated = await updateLeavePolicy(policyForm);
      setPolicy(updated);
      setPolicySavedAt(new Date());
    } catch (err) {
      setPolicyError(err?.response?.data?.error || "Could not save the leave policy.");
    } finally {
      setSavingPolicy(false);
    }
  }

  async function handleAddHoliday(e) {
    e.preventDefault();
    setHolidayError("");
    if (!holidayForm.date || !holidayForm.name.trim()) {
      setHolidayError("Both a date and a name are required.");
      return;
    }
    setAddingHoliday(true);
    try {
      const created = await createHoliday(holidayForm);
      setHolidays((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      setHolidayForm({ date: "", name: "" });
    } catch (err) {
      setHolidayError(err?.response?.data?.error || "Could not add this holiday.");
    } finally {
      setAddingHoliday(false);
    }
  }

  async function handleDeleteHoliday(id) {
    if (!confirm("Remove this public holiday?")) return;
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    try {
      await deleteHoliday(id);
    } catch {
      load();
    }
  }

  const upcoming = holidays.filter((h) => h.date >= new Date().toISOString().slice(0, 10));
  const past = holidays.filter((h) => h.date < new Date().toISOString().slice(0, 10));

  return (
    <>
      <Topbar title="Leave Settings" subtitle="Company-wide accrual policy and the public holiday calendar" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
            <form onSubmit={handleSavePolicy} className="bg-surface border border-line rounded-2xl shadow-soft p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="font-display text-base text-ink mb-1">Leave Accrual Policy</h3>
                <p className="text-xs text-muted">
                  Changes apply going forward to every employee's leave balance calculation — nothing already
                  approved or paid is recalculated.
                </p>
              </div>

              <div className="space-y-3">
                {POLICY_FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-ink">{f.label}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={policyForm[f.key] ?? ""}
                        onChange={(e) => setPolicyForm({ ...policyForm, [f.key]: e.target.value })}
                        className="w-24 text-sm border border-line rounded-xl px-3 py-2 bg-paper text-right focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      />
                      <span className="text-xs text-muted w-28">{f.suffix}</span>
                    </span>
                  </label>
                ))}
              </div>

              {policyError && <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">{policyError}</div>}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-accent text-white shadow-soft hover:bg-accentDark hover:shadow-card hover:-translate-y-0.5 disabled:opacity-60 transition-all duration-200"
                >
                  {savingPolicy ? "Saving…" : "Save Policy"}
                </button>
                {policySavedAt && <span className="text-xs text-muted">Saved {policySavedAt.toLocaleTimeString()}</span>}
              </div>
            </form>

            <div className="bg-surface border border-line rounded-2xl shadow-soft p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="font-display text-base text-ink mb-1">Public Holiday Calendar</h3>
                <p className="text-xs text-muted">
                  Days here don't count against anyone's leave balance if a request spans them — the same way
                  Sundays already don't.
                </p>
              </div>

              <form onSubmit={handleAddHoliday} className="flex flex-col sm:flex-row gap-3 items-end">
                <label className="block flex-1">
                  <span className="text-xs font-medium text-muted">Date</span>
                  <input
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </label>
                <label className="block flex-1">
                  <span className="text-xs font-medium text-muted">Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Vesak Full Moon Poya Day"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </label>
                <button
                  type="submit"
                  disabled={addingHoliday}
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-ink text-white shadow-soft hover:bg-ink/90 hover:shadow-card hover:-translate-y-0.5 disabled:opacity-60 transition-all duration-200 shrink-0"
                >
                  {addingHoliday ? "Adding…" : "+ Add"}
                </button>
              </form>
              {holidayError && <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">{holidayError}</div>}

              {holidays.length === 0 ? (
                <p className="text-sm text-muted">No holidays added yet.</p>
              ) : (
                <div className="divide-y divide-line border-t border-line pt-1">
                  {[...upcoming, ...past].map((h) => (
                    <div key={h.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <span className="text-sm text-ink font-medium">{h.date}</span>
                        <span className="text-sm text-muted ml-2">{h.name}</span>
                        {h.date < new Date().toISOString().slice(0, 10) && (
                          <span className="text-[10px] uppercase tracking-wide text-muted ml-2">Past</span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteHoliday(h.id)} className="text-xs text-muted hover:text-alert transition-colors">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
