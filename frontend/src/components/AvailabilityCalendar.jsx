import { useEffect, useState } from "react";
import MonthCalendar from "./MonthCalendar.jsx";
import { getAvailabilityCalendar, getDepartments } from "../api/client.js";

/**
 * Team availability calendar for managers/HR: for each day, how many
 * employees are available vs. on approved leave. Managers are locked to
 * their own department; HR/Admin can pick any department or "everyone".
 */
export default function AvailabilityCalendar({ role, departmentId: fixedDepartmentId }) {
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState(fixedDepartmentId || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const canPickDepartment = !fixedDepartmentId && ["admin", "hr_manager"].includes(role);

  useEffect(() => {
    if (canPickDepartment) getDepartments().then(setDepartments).catch(() => {});
  }, [canPickDepartment]);

  useEffect(() => {
    setLoading(true);
    getAvailabilityCalendar(ym.year, ym.month, departmentId || fixedDepartmentId || undefined)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ym, departmentId, fixedDepartmentId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-base text-ink">Team Availability</h3>
        {canPickDepartment && (
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="text-sm border border-line rounded-xl px-3 py-2 bg-surface shadow-soft focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="bg-surface border border-line rounded-2xl shadow-soft p-10 text-center text-sm text-muted">Loading availability…</div>
      ) : (
        <MonthCalendar
          year={ym.year}
          month={ym.month}
          onChange={(year, month) => setYm({ year, month })}
          onSelectDay={(iso) => setSelectedDay(data?.days?.[iso] ? { iso, ...data.days[iso] } : { iso, onLeave: [], availableCount: 0 })}
          renderDay={(iso) => {
            const day = data?.days?.[iso];
            if (!day) return null;
            const allAvailable = day.onLeave.length === 0;
            return (
              <div className="mt-1">
                <span
                  className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    allAvailable ? "bg-emerald-100 text-emerald-700" : "bg-alertSoft text-alert"
                  }`}
                >
                  {day.availableCount} avail
                </span>
              </div>
            );
          }}
          legend={
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Everyone available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-alert" /> Some on leave
              </span>
            </>
          }
        />
      )}

      {selectedDay && (
        <div className="mt-4 bg-surface border border-line rounded-2xl shadow-soft p-4 sm:p-5 animate-slide-over-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-ink">{selectedDay.iso}</p>
            <button onClick={() => setSelectedDay(null)} className="text-xs text-muted hover:text-ink">
              Close
            </button>
          </div>
          {selectedDay.onLeave.length === 0 ? (
            <p className="text-sm text-muted">Everyone's available.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedDay.onLeave.map((e) => (
                <li key={e.empNo} className="flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-full bg-alertSoft text-alert text-[10px] font-medium flex items-center justify-center shrink-0">
                    {e.employeeName?.slice(0, 1) || "?"}
                  </span>
                  <span className="text-ink">{e.employeeName}</span>
                  <span className="text-xs text-muted">({e.empNo})</span>
                  <span className="text-xs text-alert ml-auto">On leave</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
