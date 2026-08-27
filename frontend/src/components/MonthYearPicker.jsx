import { useEffect, useRef, useState } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A click-to-pick month/year selector — no free-text typing. Opens a
 * popover with a year stepper and a 12-month grid; months after the
 * current one are disabled by default (payslips can't exist for the future).
 */
export default function MonthYearPicker({ year, month, onChange, disableFuture = true }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year);
  const ref = useRef(null);

  useEffect(() => setViewYear(year), [year]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const now = new Date();
  const isFutureMonth = (y, m) => y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1);

  function pick(m) {
    if (disableFuture && isFutureMonth(viewYear, m)) return;
    onChange(viewYear, m);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm border border-line rounded-xl px-3.5 py-2.5 bg-surface shadow-soft hover:border-accent/40 transition-all duration-150"
      >
        <CalendarIcon />
        <span className="font-medium text-ink">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <span className="text-muted text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-64 bg-surface border border-line rounded-2xl shadow-popover p-4 animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-line text-muted hover:text-ink transition-all duration-150"
            >
              ‹
            </button>
            <p className="text-sm font-medium text-ink">{viewYear}</p>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={disableFuture && viewYear >= now.getFullYear()}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-line text-muted hover:text-ink disabled:opacity-30 transition-all duration-150"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_SHORT.map((label, i) => {
              const m = i + 1;
              const disabled = disableFuture && isFutureMonth(viewYear, m);
              const isSelected = viewYear === year && m === month;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(m)}
                  className={`text-xs font-medium py-2 rounded-lg transition-all duration-150 ${
                    isSelected
                      ? "bg-accent text-white shadow-soft"
                      : disabled
                      ? "text-muted/40 cursor-not-allowed"
                      : "text-ink hover:bg-paper"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.5h12M5 2v2.5M11 2v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export { MONTH_NAMES };
