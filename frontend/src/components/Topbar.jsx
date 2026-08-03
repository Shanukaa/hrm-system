export default function Topbar({ title, subtitle, actions }) {
  return (
    <header className="flex items-center justify-between px-8 py-6 border-b border-line bg-paper">
      <div>
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
