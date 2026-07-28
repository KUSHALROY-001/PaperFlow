// Extracted from pages/ClusterWorkspace.jsx — no behavior changes.
//
// NOTE: this statusConfig is visually different from the one in
// utils/mockTestHelpers.js (blue vs orange "processing" color, no dark-mode
// variants here). Both configs represent mock-test status badges, so this
// divergence may be unintentional drift rather than a deliberate design
// choice — worth a design review, not silently unified here.
export const clusterMockTestStatusConfig = {
  published: {
    color: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Ready",
  },
  review: {
    color: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    dot: "bg-amber-500",
    label: "Needs Review",
  },
  processing: {
    color: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
    dot: "bg-blue-500 animate-pulse",
    label: "Processing",
  },
  draft: {
    color: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    label: "Draft",
  },
  archived: {
    color: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
    label: "Archived",
  },
};
