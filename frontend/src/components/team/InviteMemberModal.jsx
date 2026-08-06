import { CheckCircle, Link as LinkIcon, X } from "lucide-react";
import { ASSIGNABLE_ROLES } from "@/utils/teamHelpers";

// Extracted from pages/Team.jsx — no behavior changes.
export default function InviteMemberModal({
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteError,
  isInviting,
  lastInviteLink,
  onSubmit,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md surface-card border border-border rounded-3xl shadow-2xl p-6">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold text-foreground">
            Invite Team Member
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-muted text-muted-foreground hover:text-foreground -mt-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mb-5">
          No email provider is configured yet, so we'll give you a link to
          share with them directly instead of emailing it.
        </p>

        {lastInviteLink ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" /> Invitation created
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block">
                Share this link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={lastInviteLink}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-foreground text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(lastInviteLink);
                    } catch {
                      // clipboard permission denied - input above is
                      // still selectable/copyable by hand
                    }
                  }}
                  className="px-3 rounded-xl bg-muted hover:bg-border transition-colors shrink-0"
                >
                  <LinkIcon className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold rounded-xl text-xs sm:text-sm transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block">
                Email Address
              </label>
              <input
                required
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-muted-foreground bg-muted border border-border rounded-xl p-3">
              <strong className="text-orange-500">Role permissions:</strong>{" "}
              Admin (full access) · Reviewer (edit clusters, review
              questions) · Viewer (read-only)
            </div>
            {inviteError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
                {inviteError}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-xl hover:bg-muted text-xs sm:text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="flex-1 py-2.5 font-semibold rounded-xl text-xs sm:text-sm transition-all bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs disabled:opacity-60"
              >
                {isInviting ? "Sending..." : "Create Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
