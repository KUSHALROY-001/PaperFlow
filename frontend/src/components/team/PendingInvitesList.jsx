import { Clock, Link as LinkIcon, Mail } from "lucide-react";
import { roleColors, roleLabel } from "@/utils/teamHelpers";
import { formatTimeAgo } from "@/lib/date";

// Extracted from pages/Team.jsx — no behavior changes.
export default function PendingInvitesList({
  invites,
  invitesLoading,
  copiedInviteId,
  onCopyLink,
  onRevoke,
}) {
  if (invitesLoading || invites.length === 0) return null;

  return (
    <div className="surface-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center">
        <span className="text-sm font-bold text-foreground">
          Pending Invites
        </span>
        <span className="ml-2 text-xs bg-amber-500/15 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
          {invites.length}
        </span>
      </div>
      <div className="divide-y divide-border">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="px-3.5 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">
                  {inv.email}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Sent {formatTimeAgo(inv.createdAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap justify-between sm:justify-end shrink-0">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${roleColors[inv.role]}`}
              >
                {roleLabel(inv.role)}
              </span>
              <span className="text-xs bg-amber-500/15 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                Pending
              </span>
              <button
                onClick={() => onCopyLink(inv)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors border border-border sm:border-0"
                title="No email provider is set up yet - copy the link and share it yourself"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {copiedInviteId === inv.id ? "Copied!" : "Copy link"}
              </button>
              <button
                onClick={() => onRevoke(inv.id)}
                className="text-xs font-semibold text-red-500 hover:bg-red-500/10 px-2.5 py-1.5 rounded-md transition-colors"
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
