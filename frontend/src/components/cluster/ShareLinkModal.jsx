import { useEffect, useState } from "react";
import { X, Share2, Copy, Check, Loader2, Trash2, Link2 } from "lucide-react";
import { formatDate } from "@/lib/date";
import { useShareLink, buildShareUrl } from "@/hooks/useShareLink";

export default function ShareLinkModal({ isOpen, onClose, mockTestId }) {
  const {
    shares,
    loading,
    error,
    creating,
    revokingId,
    loadShares,
    createShare,
    revokeShare,
  } = useShareLink(mockTestId);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (isOpen) loadShares();
  }, [isOpen, loadShares]);

  if (!isOpen) return null;

  const activeShares = shares.filter((share) => share.isActive);

  const handleCopy = async (share) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(share.shareToken));
      setCopiedId(share.id);
      setTimeout(() => setCopiedId((current) => (current === share.id ? null : current)), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) - the
      // link is still shown as selectable text below, so this isn't a
      // dead end even if the copy button itself doesn't work.
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="surface-card w-full max-w-lg rounded-3xl p-6 border border-border shadow-xl space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Share this test
              </h2>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can take it - no account needed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-500 font-semibold rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
            {error}
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && activeShares.length === 0 && (
          <div className="text-center py-6">
            <Link2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              No active share link yet.
            </p>
            <button
              onClick={createShare}
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                </>
              ) : (
                "Create share link"
              )}
            </button>
          </div>
        )}

        {!loading && activeShares.length > 0 && (
          <div className="space-y-3">
            {activeShares.map((share) => (
              <div
                key={share.id}
                className="rounded-xl border border-border bg-card p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={buildShareUrl(share.shareToken)}
                    onClick={(e) => e.target.select()}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-muted/50 text-xs font-mono text-foreground focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(share)}
                    className="w-9 h-9 shrink-0 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-orange-500 hover:border-orange-500/40 transition-all"
                    title="Copy link"
                  >
                    {copiedId === share.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => revokeShare(share.id)}
                    disabled={revokingId === share.id}
                    className="w-9 h-9 shrink-0 rounded-lg border border-red-500/20 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-all disabled:opacity-50"
                    title="Revoke link"
                  >
                    {revokingId === share.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground px-1">
                  Created {formatDate(share.createdAt)}
                  {share.expiresAt &&
                    ` · Expires ${formatDate(share.expiresAt)}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
