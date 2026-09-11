import { useState } from "react";
import Topbar from "../components/Topbar.jsx";
import LeaveApprovalQueue from "../components/LeaveApprovalQueue.jsx";
import LeaveSummaryTable from "../components/LeaveSummaryTable.jsx";

const TABS = [
  { key: "requests", label: "Requests" },
  { key: "summary", label: "Leave Summary" },
];

/** Org-wide leave approval queue + per-employee leave summary, used by admin and hr_manager. */
export default function LeaveApprovals() {
  const [tab, setTab] = useState("requests");

  return (
    <>
      <Topbar title="Leave Requests" subtitle="Review leave requests and see every employee's leave usage" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm font-medium px-4 py-2 rounded-md border transition-all duration-200 ${
                tab === t.key ? "bg-ink text-white border-ink" : "border-line text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "requests" ? <LeaveApprovalQueue /> : <LeaveSummaryTable />}
      </div>
    </>
  );
}
