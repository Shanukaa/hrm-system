export default function ProfileCard({ employee, profile, departmentName }) {
  return (
    <div className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-5 sm:p-6">
      <h3 className="font-display text-base text-ink mb-4">My Profile</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
        <Row label="Name" value={employee?.employeeName} />
        <Row label="EMP No" value={employee?.empNo} />
        <Row label="Designation" value={employee?.designation} />
        <Row label="Department" value={departmentName || "Unassigned"} />
        <Row label="Cost Centre" value={employee?.costCentre} />
        <Row label="NIC No" value={employee?.nicNo} />
        <Row label="EPF No" value={employee?.epfNo} />
        <Row label="Join Date" value={profile?.joinDate || "Not set"} />
        <Row label="Employment Type" value={profile?.employmentType === "permanent" ? "Permanent" : "Probation"} />
        <Row label="Date of Birth" value={profile?.birthDate || "Not set"} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted font-medium">{label}</p>
      <p className="text-ink mt-0.5">{value || "—"}</p>
    </div>
  );
}
