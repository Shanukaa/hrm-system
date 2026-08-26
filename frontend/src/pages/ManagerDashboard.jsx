import { useEffect, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import TabShell from "../components/TabShell.jsx";
import ProfileCard from "../components/ProfileCard.jsx";
import LeaveBalanceCard from "../components/LeaveBalanceCard.jsx";
import RequestLeaveForm from "../components/RequestLeaveForm.jsx";
import MyLeaveHistory from "../components/MyLeaveHistory.jsx";
import MyLeaveCalendar from "../components/MyLeaveCalendar.jsx";
import AvailabilityCalendar from "../components/AvailabilityCalendar.jsx";
import MyPayslips from "../components/MyPayslips.jsx";
import NotificationsPanel from "../components/NotificationsPanel.jsx";
import LeaveApprovalQueue from "../components/LeaveApprovalQueue.jsx";
import DepartmentCapacitySettings from "../components/DepartmentCapacitySettings.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getEmployee,
  getLeaveProfile,
  getLeaveBalance,
  getMyLeaveRequests,
  getMyDepartment,
  getDepartmentEmployees,
  getAllLeaveRequests,
} from "../api/client.js";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const empNo = user?.empNo;

  const [employee, setEmployee] = useState(null);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [department, setDepartment] = useState(null);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    if (!empNo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [emp, prof, bal, mine, dept] = await Promise.all([
        getEmployee(empNo),
        getLeaveProfile(empNo),
        getLeaveBalance(),
        getMyLeaveRequests(undefined, 3),
        getMyDepartment(),
      ]);
      setEmployee(emp);
      setProfile(prof);
      setBalance(bal);
      setRequests(mine);
      setDepartment(dept);

      if (dept) {
        const [deptEmps, pending] = await Promise.all([getDepartmentEmployees(dept.id), getAllLeaveRequests("pending")]);
        setDeptEmployees(deptEmps);
        setPendingCount(pending.filter((r) => deptEmps.some((e) => e.empNo === r.empNo)).length);
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empNo]);

  if (!empNo) {
    return (
      <>
        <Topbar title="Manager Dashboard" />
        <div className="p-6 sm:p-8">
          <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">
            Your account isn't linked to an employee record yet. Please contact HR.
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Topbar title="Manager Dashboard" />
        <div className="p-6 sm:p-8 text-sm text-muted">Loading your dashboard…</div>
      </>
    );
  }

  const deptEmpNos = deptEmployees.map((e) => e.empNo);

  const overview = (
    <div className="space-y-6">
      {error && <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">{error}</div>}
      {department ? (
        <div className="bg-surface border border-line rounded-lg p-5 sm:p-6">
          <h3 className="font-display text-base text-ink mb-1">{department.name}</h3>
          <p className="text-sm text-muted">
            {deptEmployees.length} team member{deptEmployees.length === 1 ? "" : "s"} ·{" "}
            {pendingCount > 0 ? (
              <span className="text-accent font-medium">{pendingCount} leave request{pendingCount === 1 ? "" : "s"} pending your review</span>
            ) : (
              "No pending leave requests"
            )}
          </p>
        </div>
      ) : (
        <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">
          You aren't assigned as the manager of any department yet. Ask HR/Admin to assign you on the Departments page.
        </div>
      )}
      <ProfileCard employee={employee} profile={profile} departmentName={department?.name} />
      <LeaveBalanceCard balance={balance} />
    </div>
  );

  const departmentTab = (
    <div className="space-y-6">
      {department && <DepartmentCapacitySettings department={department} onSaved={setDepartment} />}
      <LeaveApprovalQueue filterEmpNos={department ? deptEmpNos : []} />
    </div>
  );

  const calendarTab = (
    <div className="space-y-6">
      <MyLeaveCalendar requests={requests} />
      {department && <AvailabilityCalendar role="manager" departmentId={department.id} />}
    </div>
  );

  const tabs = [
    { key: "dashboard", label: "Dashboard", content: overview },
    { key: "profile", label: "My Profile", content: <ProfileCard employee={employee} profile={profile} departmentName={department?.name} /> },
    { key: "calendar", label: "Calendar", content: calendarTab },
    { key: "department", label: "Department", badge: pendingCount, content: departmentTab },
    { key: "payslips", label: "Payslips", content: <MyPayslips empNo={empNo} /> },
    { key: "balance", label: "Leave Balance", content: <LeaveBalanceCard balance={balance} /> },
    {
      key: "request",
      label: "Request Leave",
      content: !balance?.needsSetup ? (
        <RequestLeaveForm balance={balance} onSubmitted={loadAll} />
      ) : (
        <p className="text-sm text-muted">Your leave profile hasn't been set up yet — contact HR before requesting leave.</p>
      ),
    },
    { key: "myrequests", label: "My Leave Requests", content: <MyLeaveHistory requests={requests} /> },
    {
      key: "notifications",
      label: "Notifications",
      content: <NotificationsPanel canPostGlobal={false} canPostDepartment={!!department} userEmail={user.email} />,
    },
  ];

  return (
    <>
      <Topbar title={`Welcome, ${employee?.employeeName?.split(" ")[0] || "there"}`} subtitle="Your profile, team, and leave requests" />
      <TabShell tabs={tabs} />
    </>
  );
}
