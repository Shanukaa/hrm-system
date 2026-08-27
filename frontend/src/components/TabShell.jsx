import { useState } from "react";

/**
 * A vertical navigation rail alongside the active tab's content — used by
 * both self-service dashboards. Collapses to a horizontal scrollable strip
 * on small screens, where a vertical rail would eat too much width.
 */
export default function TabShell({ tabs, defaultTab }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) || tabs[0];

  return (
    <div className="flex flex-col md:flex-row">
      {/* Mobile: horizontal scrollable strip */}
      <div className="md:hidden border-b border-line bg-paper/80 backdrop-blur-sm overflow-x-auto">
        <div className="flex gap-1 px-4 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`relative text-sm font-medium px-3.5 py-3 whitespace-nowrap transition-all duration-200 ${
                activeTab?.key === t.key ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1.5 text-[10px] bg-accent text-white rounded-full px-1.5 py-0.5 shadow-soft">{t.badge}</span>
              )}
              <span
                className={`absolute left-3.5 right-3.5 -bottom-px h-0.5 rounded-full bg-accent transition-transform duration-200 origin-left ${
                  activeTab?.key === t.key ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: vertical rail */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-line bg-paper/60 px-3 py-6 gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex items-center justify-between text-sm font-medium px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 ${
              activeTab?.key === t.key
                ? "bg-accent text-white shadow-soft"
                : "text-muted hover:text-ink hover:bg-surface"
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span
                className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                  activeTab?.key === t.key ? "bg-white/25 text-white" : "bg-accent text-white"
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 animate-fade-in-up" key={activeTab?.key}>
        {activeTab?.content}
      </div>
    </div>
  );
}
