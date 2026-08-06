export default function ResultsFilterTabs({ filter, setFilter }) {
  const filterOptions = [
    ["all", "All Attempts"],
    ["passed", "Passed (≥60%)"],
    ["failed", "Failed (<60%)"],
  ];

  return (
    <div className="flex gap-1.5 flex-wrap">
      {filterOptions.map(([val, label]) => {
        const active = filter === val;
        return (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              active
                ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 font-bold border border-orange-500/20"
                : "bg-card border border-border text-muted-foreground hover:border-orange-500/40 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
