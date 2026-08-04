import { useEffect, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import { getUsers, createUser, updateUser, deleteUser } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const ROLE_LABELS = { admin: "Admin", hr_manager: "HR Manager", hr_executive: "HR Executive" };
const ROLES = Object.keys(ROLE_LABELS);

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "hr_executive" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setUsers(await getUsers());
    } catch (err) {
      setError(err.response?.data?.error || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await createUser(form);
      setForm({ name: "", email: "", password: "", role: "hr_executive" });
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Could not create user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(u, role) {
    await updateUser(u.id, { role });
    load();
  }

  async function handleToggleActive(u) {
    await updateUser(u.id, { active: !u.active });
    load();
  }

  async function handleDelete(u) {
    if (!confirm(`Remove ${u.name}'s account (${u.email})? They won't be able to log in anymore.`)) return;
    await deleteUser(u.id);
    load();
  }

  return (
    <>
      <Topbar
        title="Users"
        subtitle="Manage who can access the system and what they can do"
        actions={
          <button
            onClick={() => setShowForm((s) => !s)}
            className="text-sm font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            {showForm ? "Cancel" : "+ Add User"}
          </button>
        }
      />

      <div className="p-8 space-y-6">
        {error && (
          <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">{error}</div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-surface border border-line rounded-lg p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Full name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full text-sm border border-line rounded-md px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full text-sm border border-line rounded-md px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Temporary password</label>
              <input
                type="text"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full text-sm border border-line rounded-md px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full text-sm border border-line rounded-md px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            {formError && (
              <div className="md:col-span-4 border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-3.5 py-2.5">
                {formError}
              </div>
            )}

            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="text-sm font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create user"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Loading users…</div>
        ) : (
          <div className="bg-surface border border-line rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink">{u.name}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={u.id === me.id}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="text-sm border border-line rounded-md px-2 py-1.5 bg-paper disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          u.active ? "bg-accentSoft text-accent" : "bg-alertSoft text-alert"
                        }`}
                      >
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={u.id === me.id}
                        className="text-xs font-medium text-muted hover:text-ink disabled:opacity-40"
                      >
                        {u.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={u.id === me.id}
                        className="text-xs font-medium text-alert hover:text-alert/80 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
