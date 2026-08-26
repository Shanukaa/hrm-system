const SCHEME_LABEL = { monthly: "this month", annual: "this leave year" };
const EMPLOYMENT_LABEL = {
  probation: "Probation",
  permanent_under_year: "Permanent (under 1 year)",
  permanent_over_year: "Permanent (over 1 year)",
};

export default function LeaveBalanceCard({ balance }) {
  if (!balance) return null;
  const overBalance = !balance.needsSetup && balance.remaining <= 0;

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card p-5 sm:p-6">
      <h3 className="font-display text-base text-ink mb-4">Leave Balance</h3>
      {balance.needsSetup ? (
        <p className="text-sm text-muted">
          Your leave profile hasn't been set up yet. Please contact HR to record your join date and employment type
          before requesting leave.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniStat label="Entitled" value={balance.quota} />
            <MiniStat label="Used" value={balance.used} />
            <MiniStat label="Remaining" value={balance.remaining} accent={!overBalance} alert={overBalance} />
            <MiniStat label="Pending" value={balance.pendingDays} />
          </div>
          <p className="text-xs text-muted mt-3">
            {EMPLOYMENT_LABEL[balance.stage] || balance.stage} · {balance.scheme === "annual" ? "Annual allowance" : "Monthly allowance"}{" "}
            {SCHEME_LABEL[balance.scheme]} ({balance.periodStart} to {balance.periodEnd})
          </p>
          {overBalance && (
            <div className="mt-4 border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">
              Your available leave count is over for {SCHEME_LABEL[balance.scheme]}. Any further leave you take will
              be recorded as no-pay.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent, alert }) {
  return (
    <div className="bg-paper rounded-md px-3 py-3 text-center">
      <p className={`font-mono text-xl ${alert ? "text-alert" : accent ? "text-accent" : "text-ink"}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted mt-1">{label}</p>
    </div>
  );
}
