import { useState } from "react";

/** A horizontal, mobile-scrollable tab bar with content below — used by both self-service dashboards. */
export default function TabShell({ tabs, defaultTab }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) || tabs[0];

  return (
    <div>
      <div className="border-b border-line bg-paper/80 backdrop-blur-sm sticky top-0 z-10 overflow-x-auto">
        <div className="flex gap-1 px-4 sm:px-6 lg:px-8 min-w-max">
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
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in-up" key={activeTab?.key}>
        {activeTab?.content}
      </div>
    </div>
  );
}
