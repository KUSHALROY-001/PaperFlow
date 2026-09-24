import { useRef } from "react";
import { Check, HelpCircle } from "lucide-react";
import { useGuide } from "./GuideProvider";

// Mirrors UserMenu.jsx's own dropdown pattern (button + absolutely
// positioned panel) rather than introducing a different popover
// approach for just this one menu.
export default function GuideLauncher() {
  const { launcherOpen, setLauncherOpen, checklist, startChapter, replayAll } =
    useGuide();
  const containerRef = useRef(null);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setLauncherOpen(!launcherOpen)}
        aria-label="Product guide"
        title="Guide"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-orange-500/40 hover:text-orange-500 hover:bg-orange-500/10"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {launcherOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setLauncherOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-border surface-card p-2 shadow-2xl font-inter">
            <div className="px-2 py-1.5 text-xs font-bold text-foreground">
              Getting started
            </div>
            <div className="space-y-0.5">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => startChapter(item.id)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      item.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border"
                    }`}
                  >
                    {item.done && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="flex-1 capitalize">
                    {item.label}
                    {item.status === "parked" && !item.done && (
                      <span className="ml-1.5 text-[10px] font-semibold text-orange-500">
                        Resume
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-1 border-t border-border pt-1.5">
              <button
                onClick={replayAll}
                className="w-full rounded-md px-2 py-2 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Replay guide from the start
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
