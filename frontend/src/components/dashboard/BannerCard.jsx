import { Plus } from "lucide-react";

// Extracted from pages/Dashboard.jsx — no behavior changes.

function BannerIllustration() {
  return (
    <div className="relative w-44 h-28 hidden sm:block shrink-0">
      {/* Back card */}
      <div className="absolute right-0 top-1 w-32 h-20 bg-muted/60 dark:bg-card border border-border rounded-xl shadow-xs transform rotate-6" />
      {/* Middle card */}
      <div className="absolute right-3 top-3 w-32 h-20 bg-card border border-border rounded-xl shadow-sm transform rotate-3 p-2.5">
        <div className="w-full h-2 bg-orange-500/20 rounded-full mb-1.5" />
        <div className="w-3/4 h-2 bg-muted rounded-full" />
      </div>
      {/* Front main card */}
      <div className="absolute right-6 top-5 w-32 h-20 bg-card border border-border rounded-xl shadow-md p-2.5 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[8px] font-bold">
              ✓
            </div>
            <div className="w-14 h-1.5 bg-muted rounded-full" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-[8px] font-bold">
              ✓
            </div>
            <div className="w-10 h-1.5 bg-muted rounded-full" />
          </div>
        </div>
        <div className="self-end w-5 h-5 rounded-full bg-[#ea580c] text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
          ✓
        </div>
      </div>
    </div>
  );
}

export default function BannerCard({ onCreateCluster }) {
  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 border border-orange-500/20 bg-linear-to-r from-orange-500/5 via-orange-500/10 to-transparent flex items-center justify-between gap-6">
      <div className="space-y-2 max-w-xl">
        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          Cluster = workspace, Mock test = exam paper
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Example: create a JECA cluster, then add JECA PYQ 2024, JECA PYQ 2023,
          and JECA Mock Test 1 inside it.
        </p>
        <div className="pt-1">
          <button
            onClick={onCreateCluster}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-3xl text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Create Cluster
          </button>
        </div>
      </div>
      <BannerIllustration />
    </div>
  );
}
