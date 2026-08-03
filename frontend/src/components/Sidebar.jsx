import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard", icon: LedgerIcon },
  { to: "/employees/new", label: "Add Employee", icon: PlusIcon },
  { to: "/import", label: "Import Data", icon: UploadIcon },
  { to: "/payslips", label: "Payslips", icon: StubIcon },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-ink text-white flex flex-col min-h-screen">
      <div className="px-6 py-7 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center font-display font-bold text-sm">
            P
          </div>
          <div>
            <p className="font-display text-lg leading-none">Payroll</p>
            <p className="text-[11px] text-white/50 tracking-wide mt-0.5">LEDGER SYSTEM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
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

      <div className="px-6 py-5 border-t border-white/10 text-[11px] text-white/40 leading-relaxed">
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
