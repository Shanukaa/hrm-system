import { useMemo, useState } from "react";
import MonthCalendar from "./MonthCalendar.jsx";

const DOT_STYLES = {
  approved: "bg-emerald-500",
  pending: "bg-accent",
  rejected: "bg-alert",
};

/** Own-leave calendar: shows already-taken, upcoming, and rejected leave days for the signed-in employee/manager. */
export default function MyLeaveCalendar({ requests }) {
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const dayMap = useMemo(() => {
    const map = {};
    for (const r of requests) {
      const cursor = new Date(r.startDate + "T00:00:00Z");
      const end = new Date(r.endDate + "T00:00:00Z");
      while (cursor <= end) {
        const iso = cursor.toISOString().slice(0, 10);
        map[iso] = r.status;
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    return map;
  }, [requests]);

  return (
    <div className="bg-surface border border-line rounded-lg p-5 sm:p-6">
      <h3 className="font-display text-base text-ink mb-4">My Leave Calendar</h3>
      <MonthCalendar
        year={ym.year}
        month={ym.month}
        onChange={(year, month) => setYm({ year, month })}
        renderDay={(iso) => {
          const status = dayMap[iso];
          if (!status) return null;
          return <div className={`mt-1 w-full h-1.5 rounded-full ${DOT_STYLES[status]}`} />;
        }}
        legend={
          <>
            <LegendDot color="bg-emerald-500" label="Approved" />
            <LegendDot color="bg-accent" label="Pending" />
            <LegendDot color="bg-alert" label="Rejected" />
          </>
        }
      />
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
