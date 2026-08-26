import { useEffect, useState } from "react";
import { getDepartments } from "../api/client.js";

const PROBATION_OPTIONS = [3, 4, 5, 6];

/**
 * Lets an admin/hr_manager set an employee's join date, employment type
 * (probation/permanent), manager, and — once they've completed a year as
 * permanent — their annual leave allocation. Rendered inside EmployeeForm
 * when editing an existing employee.
 */
export default function LeaveProfileEditor({ empNo, profile, onSave }) {
  const [form, setForm] = useState({
    joinDate: "",
    employmentType: "probation",
    probationMonths: 6,
    managerEmpNo: "",
    annualLeaveDays: "",
    departmentId: "",
    birthDate: "",
  });
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm({
      joinDate: profile.joinDate || "",
      employmentType: profile.employmentType || "probation",
      probationMonths: profile.probationMonths || 6,
      managerEmpNo: profile.managerEmpNo || "",
      annualLeaveDays: profile.annualLeaveSet && profile.annualLeaveDays !== null ? String(profile.annualLeaveDays) : "",
      departmentId: profile.departmentId ? String(profile.departmentId) : "",
      birthDate: profile.birthDate || "",
    });
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await onSave({
        joinDate: form.joinDate || null,
        employmentType: form.employmentType,
        probationMonths: Number(form.probationMonths),
        managerEmpNo: form.managerEmpNo || null,
        annualLeaveDays: form.annualLeaveDays === "" ? null : Number(form.annualLeaveDays),
        departmentId: form.departmentId === "" ? null : Number(form.departmentId),
        birthDate: form.birthDate || null,
      });
      setSavedAt(new Date());
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save the leave profile.");
    } finally {
      setSaving(false);
    }
  }

  const qualifiesForAnnual = (() => {
    if (form.employmentType !== "permanent" || !form.joinDate) return false;
    const days = Math.floor((Date.now() - new Date(form.joinDate).getTime()) / 86400000);
    return days >= 365;
  })();

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-5">
      <h3 className="font-display text-base text-ink mb-1">Leave Profile</h3>
      <p className="text-xs text-muted mb-4">
        Controls this employee's monthly / annual leave entitlement on their self-service dashboard.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <label>
          <span className="text-xs font-medium text-muted">Join date</span>
          <input
            type="date"
            value={form.joinDate}
            onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
            className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </label>

        <label>
          <span className="text-xs font-medium text-muted">Employment type</span>
          <select
            value={form.employmentType}
            onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            <option value="probation">Probation</option>
            <option value="permanent">Permanent</option>
          </select>
        </label>

        {form.employmentType === "probation" && (
          <label>
            <span className="text-xs font-medium text-muted">Probation length (months)</span>
            <select
              value={form.probationMonths}
              onChange={(e) => setForm({ ...form, probationMonths: e.target.value })}
              className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              {PROBATION_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          <span className="text-xs font-medium text-muted">Department</span>
          <select
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            <option value="">Unassigned</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-muted mt-1 block">
            Determines whose leave-approval queue this employee's requests land in, and who reviews their leave.
          </span>
        </label>

        <label>
          <span className="text-xs font-medium text-muted">Date of birth</span>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <span className="text-[11px] text-muted mt-1 block">Used for the company-wide birthday shout-out.</span>
        </label>

        <label>
          <span className="text-xs font-medium text-muted">Manager's EMP No (fallback)</span>
          <input
            type="text"
            value={form.managerEmpNo}
            onChange={(e) => setForm({ ...form, managerEmpNo: e.target.value })}
            placeholder="Only needed if this employee has no department"
            className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </label>

        <label className="col-span-2">
          <span className="text-xs font-medium text-muted flex items-center gap-1.5">
            Annual leave allocation (days/year)
            {!qualifiesForAnnual && (
              <span className="text-[10px] uppercase tracking-wide bg-paper text-muted px-1.5 py-0.5 rounded border border-line">
                applies after 1 year as permanent
              </span>
            )}
          </span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.annualLeaveDays}
            onChange={(e) => setForm({ ...form, annualLeaveDays: e.target.value })}
            placeholder="Leave blank until you're ready to set it (default 14)"
            className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <span className="text-[11px] text-muted mt-1 block">
            Until this is set, an employee who has completed a year as permanent gets a fallback of 6 leaves/month.
            Enter a value (e.g. 14) once you're ready to switch them to the annual pool.
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-4 border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-medium px-4 py-2 rounded-xl bg-ink text-white shadow-soft hover:bg-ink/90 hover:shadow-card hover:-translate-y-0.5 disabled:opacity-60 transition-all duration-200"
        >
          {saving ? "Saving…" : "Save Leave Profile"}
        </button>
        {savedAt && <span className="text-xs text-muted">Saved {savedAt.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
