import Topbar from "../components/Topbar.jsx";
import LeaveApprovalQueue from "../components/LeaveApprovalQueue.jsx";

/** Org-wide leave approval queue, used by admin and hr_manager. */
export default function LeaveApprovals() {
  return (
    <>
      <Topbar title="Leave Requests" subtitle="Review and decide on employee leave requests" />
      <div className="p-4 sm:p-6 lg:p-8">
        <LeaveApprovalQueue />
      </div>
    </>
  );
}
