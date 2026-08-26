import { useState } from "react";

/** A horizontal, mobile-scrollable tab bar with content below — used by both self-service dashboards. */
export default function TabShell({ tabs, defaultTab }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) || tabs[0];

  return (
    <div>
      <div className="border-b border-line overflow-x-auto">
        <div className="flex gap-1 px-4 sm:px-6 lg:px-8 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`text-sm font-medium px-3.5 py-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab?.key === t.key
                  ? "border-accent text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1.5 text-[10px] bg-accent text-white rounded-full px-1.5 py-0.5">{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 sm:p-6 lg:p-8">{activeTab?.content}</div>
    </div>
  );
}
