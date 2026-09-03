import { useMemo, useState } from "react";
import MonthCalendar from "./MonthCalendar.jsx";

const STATUS_META = {
  approved: { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700", label: "Approved" },
  pending: { dot: "bg-accent", chip: "bg-accentSoft text-accent", label: "Pending" },
  rejected: { dot: "bg-alert", chip: "bg-alertSoft text-alert", label: "Rejected" },
  cancelled: { dot: "bg-muted", chip: "bg-paper text-muted", label: "Cancelled" },
};

/** Own-leave calendar: shows already-taken, upcoming, and rejected leave days for the signed-in employee/manager. */
export default function MyLeaveCalendar({ requests }) {
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selectedDay, setSelectedDay] = useState(null);

  const dayMap = useMemo(() => {
    const map = {};
    for (const r of requests) {
      const cursor = new Date(r.startDate + "T00:00:00Z");
      const end = new Date(r.endDate + "T00:00:00Z");
      while (cursor <= end) {
        const iso = cursor.toISOString().slice(0, 10);
        (map[iso] ||= []).push(r);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    return map;
  }, [requests]);

  const selectedRequests = selectedDay ? dayMap[selectedDay] || [] : [];

  return (
    <div>
      <h3 className="font-display text-base text-ink mb-4">My Leave Calendar</h3>
      <MonthCalendar
        year={ym.year}
        month={ym.month}
        onChange={(year, month) => setYm({ year, month })}
        onSelectDay={setSelectedDay}
        renderDay={(iso) => {
          const dayRequests = dayMap[iso];
          if (!dayRequests?.length) return null;
          const primary = dayRequests[0];
          const meta = STATUS_META[primary.status];
          return (
            <div className="mt-1 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {dayRequests.length > 1 && <span className="text-[9px] text-muted">+{dayRequests.length - 1}</span>}
            </div>
          );
        }}
        legend={
          <>
            <LegendDot color="bg-emerald-500" label="Approved" />
            <LegendDot color="bg-accent" label="Pending" />
            <LegendDot color="bg-alert" label="Rejected" />
          </>
        }
      />

      {selectedDay && (
        <div className="mt-4 bg-surface border border-line rounded-2xl shadow-soft p-4 sm:p-5 animate-slide-over-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-ink">{selectedDay}</p>
            <button onClick={() => setSelectedDay(null)} className="text-xs text-muted hover:text-ink">
              Close
            </button>
          </div>
          {selectedRequests.length === 0 ? (
            <p className="text-sm text-muted">No leave on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedRequests.map((r) => {
                const meta = STATUS_META[r.status];
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">
                      {r.startDate} → {r.endDate}
                      {r.reason && <span className="text-ink"> · {r.reason}</span>}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${meta.chip}`}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
