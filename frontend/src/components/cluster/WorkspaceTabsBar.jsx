export default function WorkspaceTabsBar({
  tabs = [],
  activeTab,
  setActiveTab,
}) {
  return (
    <div className="grid grid-cols-2 gap-1 surface-card border border-border rounded-2xl p-1.5 sm:flex">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-w-0 flex-1 py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              active
                ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 dark:text-orange-500 font-bold border border-orange-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
