export default function StatCard({ label, value, accent, hint }) {
  return (
    <div className="card-lift bg-surface border border-line rounded-lg px-5 py-4 animate-fade-in-up">
      <p className="text-[11px] uppercase tracking-wide text-muted font-medium">{label}</p>
      <p className={`font-mono text-2xl mt-1.5 ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
