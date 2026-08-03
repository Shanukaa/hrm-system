import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EmployeeForm from "./pages/EmployeeForm.jsx";
import Import from "./pages/Import.jsx";
import Payslips from "./pages/Payslips.jsx";

export default function App() {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees/new" element={<EmployeeForm />} />
          <Route path="/employees/:empNo/edit" element={<EmployeeForm />} />
          <Route path="/import" element={<Import />} />
          <Route path="/payslips" element={<Payslips />} />
        </Routes>
      </main>
    </div>
  );
}
