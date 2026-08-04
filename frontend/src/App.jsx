import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EmployeeForm from "./pages/EmployeeForm.jsx";
import Import from "./pages/Import.jsx";
import Payslips from "./pages/Payslips.jsx";
import Users from "./pages/Users.jsx";
import Logs from "./pages/Logs.jsx";

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

function AppShell() {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees/new" element={<EmployeeForm />} />
          <Route path="/employees/:empNo/edit" element={<EmployeeForm />} />
          <Route
            path="/import"
            element={
              <ProtectedRoute roles={["admin", "hr_manager"]}>
                <Import />
              </ProtectedRoute>
            }
          />
          <Route path="/payslips" element={<Payslips />} />
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
