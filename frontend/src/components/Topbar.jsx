export default function Topbar({ title, subtitle, actions }) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 sm:px-8 py-6 border-b border-line bg-paper/80 backdrop-blur-sm sticky top-0 z-20">
      <div>
        <h1 className="font-display text-2xl text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </header>
  );
}
