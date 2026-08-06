import { useState } from "react";
import { Check, ChevronDown, Crown, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const roleLabels = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export default function WorkspaceSwitcher() {
  const { workspaceId, workspaces, switchWorkspace } = useAuth();
  const [open, setOpen] = useState(false);

  const current = workspaces.find((w) => w.id === workspaceId);

  // Only one workspace (the common case: your own) - nothing to switch
  // between, so don't show a dropdown that does nothing.
  if (workspaces.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
          current && !current.isOwner
            ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border-border bg-card text-foreground hover:bg-muted"
        }`}
      >
        {current?.isOwner ? (
          <Crown className="w-3.5 h-3.5 text-orange-500" />
        ) : (
          <Users className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline max-w-32 truncate">
          {current?.name || "Workspace"}
        </span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close workspace switcher"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 surface-card rounded-2xl p-2 shadow-xl border border-border z-50">
            <div className="text-[11px] font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
              Your workspaces
            </div>
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  switchWorkspace(w.id);
                }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors ${
                  w.id === workspaceId
                    ? "bg-orange-500/10 text-foreground font-semibold"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {w.id === workspaceId ? (
                  <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                <span className="flex-1 truncate">{w.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                    w.isOwner
                      ? "bg-orange-500/15 text-orange-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {roleLabels[w.role] || w.role}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
