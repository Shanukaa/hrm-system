import { useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * A generic month-grid calendar. Pass `renderDay(iso, date)` to render
 * whatever badge/content belongs on each day cell — the caller owns what
 * the calendar actually shows (leave status, availability counts, etc).
 */
export default function MonthCalendar({ year, month, onChange, renderDay, legend }) {
  const [cursor, setCursor] = useState({ year, month });

  const y = year ?? cursor.year;
  const m = month ?? cursor.month;

  function go(delta) {
    let nm = m + delta;
    let ny = y;
    if (nm < 1) {
      nm = 12;
      ny -= 1;
    } else if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    setCursor({ year: ny, month: nm });
    onChange?.(ny, nm);
  }

  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startWeekday = firstOfMonth.getUTCDay();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => go(-1)}
          className="text-sm px-2.5 py-1.5 rounded-md border border-line text-muted hover:text-ink transition-colors"
        >
          ←
        </button>
        <p className="text-sm font-medium text-ink">
          {MONTH_NAMES[m - 1]} {y}
        </p>
        <button
          onClick={() => go(1)}
          className="text-sm px-2.5 py-1.5 rounded-md border border-line text-muted hover:text-ink transition-colors"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[11px] text-muted uppercase tracking-wide text-center mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} />;
          const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          return (
            <div
              key={iso}
              className={`min-h-[3.2rem] sm:min-h-[3.8rem] rounded-md border px-1.5 py-1 text-xs ${
                iso === todayIso ? "border-accent bg-accentSoft" : "border-line bg-paper"
              }`}
            >
              <p className={`font-medium ${iso === todayIso ? "text-accent" : "text-ink"}`}>{d}</p>
              {renderDay?.(iso)}
            </div>
          );
        })}
      </div>

      {legend && <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted">{legend}</div>}
    </div>
  );
}
