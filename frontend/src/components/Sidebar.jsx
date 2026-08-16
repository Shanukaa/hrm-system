import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../assets/logo.png";

const ROLE_LABELS = { admin: "Admin", hr_manager: "HR Manager", hr_executive: "HR Executive" };

const NAV = [
  { to: "/", label: "Dashboard", icon: LedgerIcon },
  { to: "/employees/new", label: "Add Employee", icon: PlusIcon },
  { to: "/import", label: "Import Data", icon: UploadIcon, roles: ["admin", "hr_manager"] },
  { to: "/payslips", label: "Payslips", icon: StubIcon },
  { to: "/users", label: "Users", icon: UsersIcon, roles: ["admin"] },
  { to: "/logs", label: "Activity Log", icon: LogIcon, roles: ["admin", "hr_manager"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(user?.role));

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <aside className="w-64 shrink-0 bg-ink text-white flex flex-col min-h-screen">
      <div className="px-6 py-7 border-b border-white/10">
        <div className="bg-white rounded-md px-3 py-2.5 inline-block">
          <img src={logo} alt="HairSkiin Sri Lanka" className="h-8 w-auto object-contain" />
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {visibleNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
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
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogoutIcon />
          Log out
        </button>
      </div>

      <div className="px-6 py-4 border-t border-white/10 text-[11px] text-white/40 leading-relaxed">
        Data source: Google Sheets
        <br />
        Connected via service account
      </div>
    </aside>
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
      <path d="M8 10.5V2.8M8 2.8L5.2 5.6M8 2.8l2.8 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
      <path d="M4 2.5h6l2.5 2.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V3.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.3 7h5.4M5.3 9.3h5.4M5.3 11.6h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 13.5H3.8a1 1 0 01-1-1V3.5a1 1 0 011-1H6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 11l3-3-3-3M13.3 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
