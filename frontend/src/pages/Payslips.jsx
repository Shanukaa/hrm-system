import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import { getEmployees, downloadPayslip, downloadAllPayslips } from "../api/client.js";
import { money } from "../api/fields.js";

export default function Payslips() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [period, setPeriod] = useState(currentMonthLabel());
  const [format, setFormat] = useState("detailed");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return employees;
    const q = query.toLowerCase();
    return employees.filter((e) => e.employeeName?.toLowerCase().includes(q) || e.empNo?.toLowerCase().includes(q));
  }, [employees, query]);

  const toggleSelect = (empNo) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(empNo) ? next.delete(empNo) : next.add(empNo);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => (filtered.every((e) => prev.has(e.empNo)) ? new Set() : new Set(filtered.map((e) => e.empNo))));

  const handleBulk = async () => {
    setBusy(true);
    try {
      await downloadAllPayslips(period, selected.size > 0 ? [...selected] : undefined, format);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Topbar
        title="Payslips"
        subtitle="Generate PDF payslips for one employee or the whole company"
        actions={
          <button
            onClick={handleBulk}
            disabled={busy}
            className="text-sm font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-60 transition-colors"
          >
            {busy ? "Preparing…" : selected.size > 0 ? `Download ${selected.size} Payslip(s)` : "Download All"}
          </button>
        }
      />

      <div className="p-8 space-y-5">
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search employee…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-sm border border-line rounded-md px-3.5 py-2.5 bg-surface w-72 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            Pay period
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border border-line rounded-md px-3 py-2 bg-surface w-40 font-nums focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Format
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="text-sm border border-line rounded-md px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              <option value="detailed">Detailed</option>
              <option value="simple">Simple (bank advice style)</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Loading employees…</div>
        ) : (
          <div className="border border-line rounded-lg bg-surface divide-y divide-line">
            <div className="flex items-center gap-3 px-5 py-3 bg-accentSoft/60 text-[11px] uppercase tracking-wide text-ink/70">
              <input type="checkbox" checked={filtered.length > 0 && filtered.every((e) => selected.has(e.empNo))} onChange={toggleAll} />
              <span>Select all</span>
            </div>
            {filtered.map((e) => (
              <div key={e.empNo} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selected.has(e.empNo)} onChange={() => toggleSelect(e.empNo)} />
                  <div>
                    <p className="text-sm font-medium text-ink">{e.employeeName}</p>
                    <p className="text-xs text-muted font-nums">
                      {e.empNo} · {e.designation || "—"} · Net {money(e.netSalary)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => downloadPayslip(e.empNo, period, format)}
                  className="text-xs px-3 py-1.5 rounded border border-line hover:border-accent hover:text-accent transition-colors"
                >
                  Download PDF
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted">No employees match your search.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function currentMonthLabel() {
  return new Date().toLocaleDateString("en-LK", { month: "long", year: "numeric" });
}
