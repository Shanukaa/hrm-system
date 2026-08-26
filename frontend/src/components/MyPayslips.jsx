import { useState } from "react";
import { downloadPayslip } from "../api/client.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MyPayslips({ empNo }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [format, setFormat] = useState("detailed");
  const [busy, setBusy] = useState(false);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const period = `${MONTH_NAMES[month]} ${year}`;

  async function handleDownload() {
    setBusy(true);
    try {
      await downloadPayslip(empNo, period, format);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5 sm:p-6">
      <h3 className="font-display text-base text-ink mb-4">My Payslips</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-muted">Month</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="mt-1 text-sm border border-line rounded-md px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Year</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="mt-1 text-sm border border-line rounded-md px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted">Format</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="mt-1 text-sm border border-line rounded-md px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            <option value="detailed">Detailed</option>
            <option value="simple">Simple</option>
          </select>
        </label>
        <button
          onClick={handleDownload}
          disabled={busy}
          className="text-sm font-medium px-5 py-2.5 rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-60 transition-colors"
        >
          {busy ? "Preparing…" : `Download ${period}`}
        </button>
      </div>
    </div>
  );
}
