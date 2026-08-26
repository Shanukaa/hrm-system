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
    <div className="bg-surface border border-line rounded-lg p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-base text-ink">Team Availability</h3>
        {canPickDepartment && (
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="text-sm border border-line rounded-md px-3 py-2 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
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
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <MonthCalendar
          year={ym.year}
          month={ym.month}
          onChange={(year, month) => setYm({ year, month })}
          renderDay={(iso) => {
            const day = data?.days?.[iso];
            if (!day) return null;
            return (
              <button onClick={() => setSelectedDay({ iso, ...day })} className="mt-1 block w-full text-left">
                <span className={`text-[10px] font-medium ${day.onLeave.length > 0 ? "text-alert" : "text-emerald-600"}`}>
                  {day.availableCount} avail
                </span>
              </button>
            );
          }}
        />
      )}

      {selectedDay && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">{selectedDay.iso}</p>
          {selectedDay.onLeave.length === 0 ? (
            <p className="text-sm text-muted mt-1">Everyone's available.</p>
          ) : (
            <ul className="text-sm text-muted mt-1 space-y-0.5">
              {selectedDay.onLeave.map((e) => (
                <li key={e.empNo}>
                  {e.employeeName} <span className="text-xs">({e.empNo})</span> — on leave
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
