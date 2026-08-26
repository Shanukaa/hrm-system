import { useEffect, useState } from "react";
import { updateDepartment } from "../api/client.js";

/** Lets a manager set the max number of their department's staff who can be on leave at once. */
export default function DepartmentCapacitySettings({ department, onSaved }) {
  const [max, setMax] = useState(department?.maxConcurrentLeaves ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMax(department?.maxConcurrentLeaves ?? "");
  }, [department]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await updateDepartment(department.id, { maxConcurrentLeaves: max === "" ? null : Number(max) });
      setSavedAt(new Date());
      onSaved?.(updated);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save this setting.");
    } finally {
      setSaving(false);
    }
  }

  if (!department) return null;

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-5 sm:p-6">
      <h3 className="font-display text-base text-ink mb-1">Department Leave Capacity — {department.name}</h3>
      <p className="text-xs text-muted mb-4">
        The maximum number of your team who can be on leave on the same day. Employees can still submit requests past
        this — you'll just see a warning when approving one that goes over.
      </p>
      <div className="flex items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-muted">Max staff on leave at once</span>
          <input
            type="number"
            min="0"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="No limit"
            className="mt-1 w-40 text-sm border border-line rounded-xl px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-medium px-4 py-2 rounded-xl bg-ink text-white shadow-soft hover:bg-ink/90 hover:shadow-card hover:-translate-y-0.5 disabled:opacity-60 transition-all duration-200"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {savedAt && <span className="text-xs text-muted">Saved {savedAt.toLocaleTimeString()}</span>}
      </div>
      {error && <div className="mt-3 border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">{error}</div>}
    </div>
  );
}
