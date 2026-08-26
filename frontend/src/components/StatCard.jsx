export default function StatCard({ label, value, accent, hint }) {
  return (
    <div className="group relative overflow-hidden card-lift bg-surface border border-line rounded-2xl shadow-soft transition-shadow duration-200 hover:shadow-card px-5 py-4 animate-fade-in-up">
      <div
        className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${
          accent ? "from-accent to-accentDark" : "from-line to-line"
        } opacity-70 group-hover:opacity-100 transition-opacity`}
      />
      <p className="text-[11px] uppercase tracking-wide text-muted font-medium">{label}</p>
      <p className={`font-mono text-2xl mt-1.5 ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
