import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import { FIELDS, calculatePayroll, money } from "../api/fields.js";
import { createEmployee, updateEmployee, getEmployee } from "../api/client.js";

const SECTIONS = [
  { key: "identity", title: "Employee Details" },
  { key: "earnings", title: "Earnings" },
  { key: "deductions", title: "Deductions" },
  { key: "employer", title: "Employer Contributions" },
  { key: "banking", title: "Bank Details" },
];

const emptyForm = Object.fromEntries(FIELDS.map((f) => [f.key, f.type === "number" ? "0" : ""]));

export default function EmployeeForm() {
  const { empNo } = useParams();
  const isEdit = Boolean(empNo);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    getEmployee(empNo)
      .then((data) => setForm({ ...emptyForm, ...data }))
      .catch(() => setError("Could not load this employee."))
      .finally(() => setLoading(false));
  }, [empNo, isEdit]);

  const computed = useMemo(() => calculatePayroll(form), [form]);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await updateEmployee(empNo, form);
      } else {
        await createEmployee(form);
      }
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save this employee. Check EMP No is unique.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Topbar title="Loading…" />
        <div className="p-8 text-sm text-muted">Fetching employee record…</div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title={isEdit ? `Edit ${form.employeeName || empNo}` : "Add Employee"}
        subtitle={isEdit ? `EMP No ${empNo} — changes save directly to the Google Sheet` : "Creates a new row in the Google Sheet"}
      />

      <form onSubmit={handleSubmit} className="p-8 max-w-5xl">
        {error && (
          <div className="mb-6 border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.key} className="bg-surface border border-line rounded-lg p-5">
                <h3 className="font-display text-base text-ink mb-4">{section.title}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {FIELDS.filter((f) => f.section === section.key).map((f) => (
                    <label key={f.key} className={f.type === "text" && f.key === "employeeName" ? "col-span-2" : ""}>
                      <span className="text-xs font-medium text-muted flex items-center gap-1.5">
                        {f.label}
                        {f.required && <span className="text-alert">*</span>}
                        {f.calculated && (
                          <span className="text-[10px] uppercase tracking-wide bg-accentSoft text-accent px-1.5 py-0.5 rounded">
                            auto
                          </span>
                        )}
                      </span>
                      <input
                        type={f.type === "number" ? "number" : "text"}
                        step={f.type === "number" ? "0.01" : undefined}
                        value={f.calculated ? computed[f.key] : form[f.key]}
                        disabled={f.calculated || (isEdit && f.key === "empNo")}
                        required={f.required}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        className={`mt-1 w-full text-sm border rounded-md px-3 py-2 font-nums ${
                          f.calculated
                            ? "bg-paper text-muted border-line cursor-not-allowed"
                            : "bg-surface border-line focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        }`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-ink text-white rounded-lg p-6">
              <p className="text-[11px] uppercase tracking-wide text-white/50">Live Preview</p>
              <p className="font-display text-lg mt-1">{form.employeeName || "New Employee"}</p>

              <div className="mt-5 space-y-2.5 text-sm">
                <Row label="Gross Salary" value={money(computed.grossSalary)} />
                <Row label="Employee EPF (8%)" value={money(computed.employeeEpf8)} />
                <Row label="Apit" value={money(form.apit)} />
                <Row label="Deductions" value={money(form.deductions)} />
              </div>

              <div className="stub-divider my-4" />

              <Row label="Net Salary" value={money(computed.netSalary)} big />

              <div className="mt-5 pt-4 border-t border-white/10 space-y-2.5 text-sm text-white/70">
                <Row label="Company EPF (12%)" value={money(computed.companyEpf12)} muted />
                <Row label="ETF (3%)" value={money(computed.etf3)} muted />
                <Row label="Cost to Company" value={money(computed.costToCompany)} muted />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-6 w-full bg-accent hover:bg-accent/90 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-md transition-colors"
              >
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Employee"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-2 w-full text-white/60 hover:text-white text-sm py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

function Row({ label, value, big, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-white/50" : "text-white/70"}>{label}</span>
      <span className={`font-mono ${big ? "text-lg text-white font-semibold" : muted ? "text-white/80" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}
