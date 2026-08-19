import { Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { roleLabelFor } from "./navConfig";

export default function GuestWorkspaceBanner() {
  const { workspaceId, workspaces } = useAuth();
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);
  const isGuestWorkspace = Boolean(currentWorkspace && !currentWorkspace.isOwner);

  if (!isGuestWorkspace) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
      <Users className="w-3.5 h-3.5 shrink-0" />
      <span>
        You're viewing <strong>{currentWorkspace.name}</strong> as{" "}
        {roleLabelFor(currentWorkspace.role)} — not your own workspace.
      </span>
    </div>
  );
}
