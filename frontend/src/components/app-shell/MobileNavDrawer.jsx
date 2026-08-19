import { X } from "lucide-react";
import Sidebar from "./Sidebar";

export default function MobileNavDrawer({
  isOpen,
  onClose,
  location,
  onCreateCluster,
  badges,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-[min(20rem,86vw)] flex-col bg-card border-r border-border shadow-2xl">
        <div className="absolute right-3 top-3">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Sidebar
          location={location}
          onNavigate={onClose}
          onCreateCluster={onCreateCluster}
          badges={badges}
        />
      </aside>
    </div>
  );
}
