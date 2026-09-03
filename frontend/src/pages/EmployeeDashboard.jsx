import { useEffect, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import TabShell from "../components/TabShell.jsx";
import ProfileCard from "../components/ProfileCard.jsx";
import LeaveBalanceCard from "../components/LeaveBalanceCard.jsx";
import RequestLeaveForm from "../components/RequestLeaveForm.jsx";
import MyLeaveHistory from "../components/MyLeaveHistory.jsx";
import MyLeaveCalendar from "../components/MyLeaveCalendar.jsx";
import MyPayslips from "../components/MyPayslips.jsx";
import NotificationsPanel from "../components/NotificationsPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getEmployee, getLeaveProfile, getLeaveBalance, getMyLeaveRequests, getDepartments } from "../api/client.js";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const empNo = user?.empNo;

  const [employee, setEmployee] = useState(null);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
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
      const [emp, prof, bal, mine, depts] = await Promise.all([
        getEmployee(empNo),
        getLeaveProfile(empNo),
        getLeaveBalance(),
        getMyLeaveRequests(undefined, 3),
        getDepartments().catch(() => []),
      ]);
      setEmployee(emp);
      setProfile(prof);
      setBalance(bal);
      setRequests(mine);
      setDepartments(depts);
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
        <Topbar title="My Dashboard" />
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
        <Topbar title="My Dashboard" />
        <div className="p-6 sm:p-8 text-sm text-muted">Loading your dashboard…</div>
      </>
    );
  }

  const departmentName = departments.find((d) => d.id === profile?.departmentId)?.name;

  const overview = (
    <div className="space-y-6">
      {error && <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">{error}</div>}
      <ProfileCard employee={employee} profile={profile} departmentName={departmentName} />
      <LeaveBalanceCard balance={balance} />
    </div>
  );

  const tabs = [
    { key: "dashboard", label: "Dashboard", content: overview },
    { key: "profile", label: "My Profile", content: <ProfileCard employee={employee} profile={profile} departmentName={departmentName} /> },
    { key: "calendar", label: "Calendar", content: <MyLeaveCalendar requests={requests} /> },
    { key: "payslips", label: "Payslips", content: <MyPayslips empNo={empNo} /> },
    {
      key: "leave",
      label: "Leave Balance & Request",
      content: (
        <div className="space-y-6">
          <LeaveBalanceCard balance={balance} />
          {!balance?.needsSetup ? (
            <RequestLeaveForm balance={balance} onSubmitted={loadAll} />
          ) : (
            <p className="text-sm text-muted">Your leave profile hasn't been set up yet — contact HR before requesting leave.</p>
          )}
        </div>
      ),
    },
    { key: "myrequests", label: "My Leave Requests", content: <MyLeaveHistory requests={requests} onChanged={loadAll} /> },
    { key: "notifications", label: "Notifications", content: <NotificationsPanel canPostGlobal={false} canPostDepartment={false} userEmail={user.email} /> },
  ];

  return (
    <>
      <Topbar title={`Welcome, ${employee?.employeeName?.split(" ")[0] || "there"}`} subtitle="Your profile, leave balance and requests" />
      <TabShell tabs={tabs} />
    </>
  );
}
