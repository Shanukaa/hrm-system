import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import MonthYearPicker, { MONTH_NAMES } from "../components/MonthYearPicker.jsx";
import Pagination from "../components/Pagination.jsx";
import { usePagination } from "../hooks/usePagination.js";
import { getEmployees, downloadPayslip, downloadAllPayslips } from "../api/client.js";
import { money } from "../api/fields.js";

export default function Payslips() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
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

  const { pageItems, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const periodLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;

  const toggleSelect = (empNo) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(empNo) ? next.delete(empNo) : next.add(empNo);
      return next;
    });

  const toggleAllOnPage = () =>
    setSelected((prev) => (pageItems.every((e) => prev.has(e.empNo)) ? new Set() : new Set([...prev, ...pageItems.map((e) => e.empNo)])));

  const handleBulk = async () => {
    setBusy(true);
    try {
      await downloadAllPayslips(periodLabel, selected.size > 0 ? [...selected] : undefined, "simple");
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
            className="text-sm font-medium px-4 py-2 rounded-xl bg-accent text-white shadow-soft hover:bg-accentDark hover:shadow-card hover:-translate-y-0.5 disabled:opacity-60 transition-all duration-200"
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
            className="text-sm border border-line rounded-xl px-3.5 py-2.5 bg-surface w-72 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            Pay period
            <MonthYearPicker year={period.year} month={period.month} onChange={(year, month) => setPeriod({ year, month })} />
          </label>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Loading employees…</div>
        ) : (
          <>
            <div className="border border-line rounded-2xl bg-surface shadow-soft divide-y divide-line overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 bg-accentSoft/60 text-[11px] uppercase tracking-wide text-ink/70">
                <input type="checkbox" checked={pageItems.length > 0 && pageItems.every((e) => selected.has(e.empNo))} onChange={toggleAllOnPage} />
                <span>Select all on this page</span>
                {selected.size > 0 && <span className="ml-auto normal-case text-xs text-accent font-medium">{selected.size} selected</span>}
              </div>
              {pageItems.map((e) => (
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
                    onClick={() => downloadPayslip(e.empNo, periodLabel, "simple")}
                    className="text-xs px-3 py-1.5 rounded-lg border border-line hover:border-accent hover:text-accent transition-all duration-200"
                  >
                    Download PDF
                  </button>
                </div>
              ))}
              {filtered.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No employees match your search.</p>}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={pageSize} />
          </>
        )}
      </div>
    </>
  );
}
