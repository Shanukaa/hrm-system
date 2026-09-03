import { useEffect, useMemo, useState } from "react";
import { downloadPayslip, getLeaveProfile } from "../api/client.js";
import { usePagination } from "../hooks/usePagination.js";
import Pagination from "./Pagination.jsx";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Available payslips up to the current month only — nothing in the future can exist yet. */
function buildAvailablePeriods(earliestDate) {
  const now = new Date();
  const periods = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  const earliest = earliestDate ? new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1) : null;
  // Cap at 10 years back regardless, so a very old join date doesn't produce an endless list.
  const hardStop = new Date(now.getFullYear() - 10, now.getMonth(), 1);

  while (cursor >= (earliest && earliest > hardStop ? earliest : hardStop)) {
    periods.push({ year: cursor.getFullYear(), month: cursor.getMonth(), label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}` });
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return periods;
}

export default function MyPayslips({ empNo }) {
  const [joinDate, setJoinDate] = useState(null);
  const [busyPeriod, setBusyPeriod] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getLeaveProfile(empNo)
      .then((p) => setJoinDate(p?.joinDate ? new Date(p.joinDate) : null))
      .catch(() => {});
  }, [empNo]);

  const allPeriods = useMemo(() => buildAvailablePeriods(joinDate), [joinDate]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allPeriods;
    const q = search.trim().toLowerCase();
    return allPeriods.filter((p) => p.label.toLowerCase().includes(q));
  }, [allPeriods, search]);

  const { pageItems, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 8);

  async function handleDownload(period) {
    setBusyPeriod(period.label);
    try {
      await downloadPayslip(empNo, period.label, "simple");
    } finally {
      setBusyPeriod(null);
    }
  }

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-5 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="font-display text-base text-ink">My Payslips</h3>
          <p className="text-xs text-muted mt-0.5">
            Available up to the current month — search by month or year. Once generated, a payslip's figures are
            locked to that month permanently.
          </p>
        </div>
        <input
          type="text"
          placeholder="Search e.g. “August” or “2026”"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-line rounded-xl px-3.5 py-2 bg-paper w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">No payslips match your search.</p>
      ) : (
        <>
          <div className="divide-y divide-line border-t border-line">
            {pageItems.map((p) => (
              <div key={p.label} className="flex items-center justify-between py-3">
                <p className="text-sm text-ink font-medium">{p.label}</p>
                <button
                  onClick={() => handleDownload(p)}
                  disabled={busyPeriod === p.label}
                  className="text-xs font-medium px-3.5 py-2 rounded-lg border border-line hover:border-accent hover:text-accent disabled:opacity-60 transition-all duration-150"
                >
                  {busyPeriod === p.label ? "Preparing…" : "Download PDF"}
                </button>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={pageSize} />
        </>
      )}
    </div>
  );
}
