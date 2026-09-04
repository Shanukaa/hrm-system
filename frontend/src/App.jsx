import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import EmployeeForm from "./pages/EmployeeForm.jsx";
import Import from "./pages/Import.jsx";
import Payslips from "./pages/Payslips.jsx";
import Users from "./pages/Users.jsx";
import Logs from "./pages/Logs.jsx";
import LeaveApprovals from "./pages/LeaveApprovals.jsx";
import Departments from "./pages/Departments.jsx";
import LeaveSettings from "./pages/LeaveSettings.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

/** Renders the right landing page for "/" based on the signed-in role. */
function Home() {
  const { user } = useAuth();
  if (user?.role === "employee") return <EmployeeDashboard />;
  if (user?.role === "manager") return <ManagerDashboard />;
  return <Dashboard />;
}

function AppShell() {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/employees/new"
            element={
              <ProtectedRoute roles={["admin", "hr_manager", "hr_executive"]}>
                <EmployeeForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/:empNo/edit"
            element={
              <ProtectedRoute roles={["admin", "hr_manager", "hr_executive"]}>
                <EmployeeForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import"
            element={
              <ProtectedRoute roles={["admin", "hr_manager"]}>
                <Import />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payslips"
            element={
              <ProtectedRoute roles={["admin", "hr_manager", "hr_executive"]}>
                <Payslips />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaves"
            element={
              <ProtectedRoute roles={["admin", "hr_manager"]}>
                <LeaveApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <ProtectedRoute roles={["admin", "hr_manager"]}>
                <Departments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-settings"
            element={
              <ProtectedRoute roles={["admin", "hr_manager"]}>
                <LeaveSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute roles={["admin", "hr_manager"]}>
                <Logs />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
