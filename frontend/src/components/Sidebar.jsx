import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../assets/logo.png";

const ROLE_LABELS = {
  admin: "Admin",
  hr_manager: "HR Manager",
  hr_executive: "HR Executive",
  manager: "Manager",
  employee: "Employee",
};

const NAV = [
  { to: "/", label: "Dashboard", icon: LedgerIcon, roles: ["admin", "hr_manager", "hr_executive"] },
  { to: "/", label: "My Dashboard", icon: LedgerIcon, roles: ["employee", "manager"] },
  { to: "/employees/new", label: "Add Employee", icon: PlusIcon, roles: ["admin", "hr_manager", "hr_executive"] },
  { to: "/import", label: "Import Data", icon: UploadIcon, roles: ["admin", "hr_manager"] },
  { to: "/payslips", label: "Payslips", icon: StubIcon, roles: ["admin", "hr_manager", "hr_executive"] },
  { to: "/departments", label: "Departments", icon: DeptIcon, roles: ["admin", "hr_manager"] },
  { to: "/leaves", label: "Leave Requests", icon: LeafIcon, roles: ["admin", "hr_manager"] },
  { to: "/users", label: "Users", icon: UsersIcon, roles: ["admin"] },
  { to: "/logs", label: "Activity Log", icon: LogIcon, roles: ["admin", "hr_manager"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const visibleNav = NAV.filter((item) => item.roles.includes(user?.role));

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const navBody = (
    <>
      <div className="px-6 py-7 border-b border-white/10 flex items-center justify-between">
        <div className="bg-white rounded-xl px-3 py-2.5 inline-block shadow-soft">
          <img src={logo} alt="HairSkiin Sri Lanka" className="h-8 w-auto object-contain" />
        </div>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-white/60 hover:text-white p-1"
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {visibleNav.map(({ to, label, icon: Icon }, i) => (
          <NavLink
            key={`${to}-${label}-${i}`}
            to={to}
            end={to === "/"}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-accent/25 to-accent/5 text-white shadow-[inset_0_0_0_1px_rgba(168,129,60,0.35)]"
                  : "text-white/60 hover:text-white hover:bg-white/5 hover:translate-x-0.5"
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        {user && (
          <div className="px-2.5 py-2 mb-2">
            <p className="text-sm text-white truncate">{user.name}</p>
            <p className="text-[11px] text-white/45">{ROLE_LABELS[user.role] || user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          <LogoutIcon />
          Log out
        </button>
      </div>

      <div className="px-6 py-4 border-t border-white/10 text-[11px] text-white/40 leading-relaxed">
        Data source: MySQL database
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-ink text-white flex items-center justify-between px-4 border-b border-white/10 shadow-[0_4px_20px_-6px_rgba(22,28,39,0.4)]">
        <button onClick={() => setOpen(true)} className="p-1.5 text-white/80 hover:text-white transition-colors" aria-label="Open menu">
          <MenuIcon />
        </button>
        <div className="bg-white rounded-lg px-2.5 py-1.5 shadow-soft">
          <img src={logo} alt="HairSkiin Sri Lanka" className="h-5 w-auto object-contain" />
        </div>
        <div className="w-7" />
      </div>

      {/* Backdrop for mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-ink text-white flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navBody}
      </aside>

      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-ink text-white flex-col min-h-screen shadow-[4px_0_24px_-8px_rgba(22,28,39,0.35)]">{navBody}</aside>
    </>
  );
}

function LedgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 6h6M5 8.5h6M5 11h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5.3v5.4M5.3 8h5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 10.5V2.8M8 2.8L5.2 5.6M8 2.8l2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.5 10.5v2a1 1 0 001 1h9a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function StubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 9.5h11" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.6 1.6" />
      <circle cx="2.5" cy="9.5" r="1.1" fill="#14213D" stroke="currentColor" strokeWidth="1" />
      <circle cx="13.5" cy="9.5" r="1.1" fill="#14213D" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 13c0-2.2 1.8-3.6 4-3.6s4 1.4 4 3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="11.3" cy="5.8" r="1.7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 9.7c1.8.1 3.2 1.3 3.2 3.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function LogIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 2.5h6l2.5 2.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V3.5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M5.3 7h5.4M5.3 9.3h5.4M5.3 11.6h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M6.5 13.5H3.8a1 1 0 01-1-1V3.5a1 1 0 011-1H6.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.5 11l3-3-3-3M13.3 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DeptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="7" width="4.5" height="7" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9.5" y="4" width="4.5" height="10" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.3 9.5h0M11.8 6.5h0M11.8 9h0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function LeafIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 2.5c.4 4-1 7.4-3.4 9.8-2.4 2.4-5.5 2.7-7.1 2.4-.3-1.6 0-4.7 2.4-7.1 2.4-2.4 5.8-3.8 9.8-4.2 -1.2 1.2-4.9-1-6.9 1.2-1.4 1.5-2 3.4-2 3.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
