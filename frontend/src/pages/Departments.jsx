import { useEffect, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getEmployees } from "../api/client.js";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // department being edited, or null for "new"
  const [form, setForm] = useState({ name: "", managerEmpNo: "", maxConcurrentLeaves: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [d, e] = await Promise.all([getDepartments(), getEmployees()]);
      setDepartments(d);
      setEmployees(e);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load departments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: "", managerEmpNo: "", maxConcurrentLeaves: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(dept) {
    setEditing(dept);
    setForm({
      name: dept.name,
      managerEmpNo: dept.managerEmpNo || "",
      maxConcurrentLeaves: dept.maxConcurrentLeaves ?? "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Department name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateDepartment(editing.id, form);
      } else {
        await createDepartment(form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err?.response?.data?.error || "Could not save the department.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(dept) {
    if (!confirm(`Delete "${dept.name}"? Employees assigned to it will become unassigned.`)) return;
    try {
      await deleteDepartment(dept.id);
      load();
    } catch (err) {
      alert(err?.response?.data?.error || "Could not delete this department.");
    }
  }

  return (
    <>
      <Topbar
        title="Departments"
        subtitle="Organize your employees into departments and assign a manager to each"
        actions={
          <button
            onClick={openNew}
            className="text-sm font-medium px-4 py-2 rounded-xl bg-accent text-white shadow-soft hover:bg-accentDark hover:shadow-card hover:-translate-y-0.5 transition-all duration-200"
          >
            + Add Department
          </button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        {error && <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">{error}</div>}

        {showForm && (
          <form onSubmit={handleSave} className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-5 space-y-4">
            <h3 className="font-display text-base text-ink">{editing ? "Edit Department" : "New Department"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-muted">Department name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="e.g. Salon Operations"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Manager</span>
                <select
                  value={form.managerEmpNo}
                  onChange={(e) => setForm({ ...form, managerEmpNo: e.target.value })}
                  className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.empNo} value={emp.empNo}>
                      {emp.empNo} — {emp.employeeName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Max staff on leave at once</span>
                <input
                  type="number"
                  min="0"
                  value={form.maxConcurrentLeaves}
                  onChange={(e) => setForm({ ...form, maxConcurrentLeaves: e.target.value })}
                  placeholder="No limit"
                  className="mt-1 w-full text-sm border border-line rounded-xl px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </label>
            </div>
            {formError && <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">{formError}</div>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="text-sm font-medium px-4 py-2 rounded-xl bg-ink text-white shadow-soft hover:bg-ink/90 hover:shadow-card hover:-translate-y-0.5 disabled:opacity-60 transition-all duration-200"
              >
                {saving ? "Saving…" : "Save"}
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

        {loading ? (
          <p className="text-sm text-muted">Loading departments…</p>
        ) : departments.length === 0 ? (
          <p className="text-sm text-muted">No departments yet. Add one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => (
              <div key={d.id} className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-5 card-lift">
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-base text-ink">{d.name}</h3>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(d)} className="text-xs text-muted hover:text-ink px-1.5 py-1">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(d)} className="text-xs text-muted hover:text-alert px-1.5 py-1">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <p className="text-muted">
                    Manager: <span className="text-ink">{d.managerName || "Unassigned"}</span>
                  </p>
                  <p className="text-muted">
                    Employees: <span className="text-ink font-mono">{d.employeeCount}</span>
                  </p>
                  <p className="text-muted">
                    Max simultaneous leave:{" "}
                    <span className="text-ink font-mono">{d.maxConcurrentLeaves ?? "No limit"}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
