import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Mail, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { formatTimeAgo } from "@/lib/date";
import { SkeletonRowList } from "@/components/ui/skeleton-row";

const roleLabels = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const roleColors = {
  admin: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
  editor: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  viewer: "bg-muted text-muted-foreground border border-border",
};

export default function MyInvitations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { switchWorkspace } = useAuth();
  const [acceptingId, setAcceptingId] = useState(null);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: api.listMyInvitations,
  });

  const invitations = data?.invitations || [];

  const handleAccept = async (invitation) => {
    setError("");
    setAcceptingId(invitation.id);

    try {
      const result = await api.acceptInvitation(invitation.token);
      await queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
      // Land them in the workspace they just joined rather than wherever
      // they happened to be - switchWorkspace does a full reload, which is
      // also the moment the new workspace shows up in the switcher.
      switchWorkspace(result.workspaceId);
    } catch (acceptError) {
      setError(acceptError.message || "Could not accept this invitation");
      setAcceptingId(null);
    }
  };

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          Invitations
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Workspaces other people have invited you to join.
        </p>
      </div>

      {isLoading && <SkeletonRowList count={3} showAvatar />}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
          {error}
        </div>
      )}

      {!isLoading && invitations.length === 0 && (
        <div className="surface-card rounded-2xl border border-border p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            No pending invitations
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            When someone invites you to their workspace, it'll show up here.
          </p>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="surface-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="px-4 sm:px-6 py-4 flex flex-wrap sm:flex-nowrap items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">
                    {inv.workspaceName}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Invited {formatTimeAgo(inv.createdAt)}
                    {inv.invitedByName ? ` by ${inv.invitedByName}` : ""}
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${roleColors[inv.role] || roleColors.viewer}`}
                >
                  {roleLabels[inv.role] || inv.role}
                </span>
                <button
                  onClick={() => handleAccept(inv)}
                  disabled={acceptingId === inv.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-60 shrink-0"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {acceptingId === inv.id ? "Joining..." : "Accept"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
