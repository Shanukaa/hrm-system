import { useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * A modern, detailed month-grid calendar: shows leading/trailing days from
 * adjacent months for a complete grid, highlights today, and lets the
 * caller render whatever belongs on each day via `renderDay(iso)`. The
 * caller owns the day content — this component owns the chrome (nav,
 * grid, weekday header, today ring, transitions).
 */
export default function MonthCalendar({ year, month, onChange, renderDay, legend, onSelectDay }) {
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

  function goToday() {
    const now = new Date();
    const ny = now.getFullYear();
    const nm = now.getMonth() + 1;
    setCursor({ year: ny, month: nm });
    onChange?.(ny, nm);
  }

  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInPrevMonth = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();

  // Build a complete grid: trailing days of the previous month, the full
  // current month, and leading days of the next month.
  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, inMonth: false, offset: -1 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, offset: 0 });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, inMonth: false, offset: 1 });
  }

  function isoFor(cell) {
    const targetMonth = m + cell.offset;
    const d = new Date(Date.UTC(y, targetMonth - 1, cell.day));
    return d.toISOString().slice(0, 10);
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => go(-1)}
            aria-label="Previous month"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-line text-muted hover:text-ink hover:bg-paper transition-all duration-150"
          >
            ‹
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next month"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-line text-muted hover:text-ink hover:bg-paper transition-all duration-150"
          >
            ›
          </button>
        </div>
        <p className="font-display text-base sm:text-lg text-ink tracking-tight">
          {MONTH_NAMES[m - 1]} <span className="text-muted font-normal">{y}</span>
        </p>
        <button
          onClick={goToday}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-line text-muted hover:text-accent hover:border-accent/40 transition-all duration-150"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-muted uppercase tracking-wide text-center mb-1.5 font-medium">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 animate-fade-in-up" key={`${y}-${m}`}>
        {cells.map((cell, i) => {
          const iso = isoFor(cell);
          const isToday = iso === todayIso;
          const isWeekend = new Date(iso + "T00:00:00Z").getUTCDay() % 6 === 0;

          return (
            <button
              key={`${iso}-${i}`}
              onClick={() => cell.inMonth && onSelectDay?.(iso)}
              disabled={!cell.inMonth || !onSelectDay}
              className={`group relative min-h-[3.6rem] sm:min-h-[4.4rem] rounded-xl border px-1.5 py-1.5 text-left transition-all duration-150 ${
                !cell.inMonth
                  ? "border-transparent bg-transparent opacity-40"
                  : isToday
                  ? "border-accent bg-accentSoft shadow-glow"
                  : isWeekend
                  ? "border-line/70 bg-paper/60 hover:border-accent/30 hover:shadow-soft"
                  : "border-line bg-surface hover:border-accent/30 hover:shadow-soft"
              } ${cell.inMonth && onSelectDay ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`inline-flex items-center justify-center text-xs font-medium w-5 h-5 rounded-full ${
                  isToday ? "bg-accent text-white" : cell.inMonth ? "text-ink" : "text-muted"
                }`}
              >
                {cell.day}
              </span>
              {cell.inMonth && renderDay?.(iso)}
            </button>
          );
        })}
      </div>

      {legend && <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-line text-[11px] text-muted">{legend}</div>}
    </div>
  );
}
