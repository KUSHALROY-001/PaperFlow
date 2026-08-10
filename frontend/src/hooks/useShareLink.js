import { useState, useCallback } from "react";
import { api } from "@/lib/api";

// Full public URL a taker would actually click - the API only returns
// the bare token (see shared.service.js#serializeShare), building the
// full link is a frontend concern since it depends on wherever this
// specific deployment is actually hosted.
export function buildShareUrl(shareToken) {
  return `${window.location.origin}/shared/${shareToken}`;
}

export function useShareLink(mockTestId) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const loadShares = useCallback(async () => {
    if (!mockTestId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.listShareLinks(mockTestId);
      setShares(result.shares || []);
    } catch (err) {
      setError(err.message || "Could not load share links.");
    } finally {
      setLoading(false);
    }
  }, [mockTestId]);

  const createShare = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      // createOrGetShareLink on the backend is idempotent - reuses an
      // existing active link rather than minting a new one every click,
      // so this is safe to call even if one already exists.
      await api.createShareLink(mockTestId);
      await loadShares();
    } catch (err) {
      setError(err.message || "Could not create a share link.");
    } finally {
      setCreating(false);
    }
  }, [mockTestId, loadShares]);

  const revokeShare = useCallback(
    async (shareId) => {
      setRevokingId(shareId);
      setError(null);
      try {
        await api.revokeShareLink(mockTestId, shareId);
        await loadShares();
      } catch (err) {
        setError(err.message || "Could not revoke this share link.");
      } finally {
        setRevokingId(null);
      }
    },
    [mockTestId, loadShares],
  );

  return {
    shares,
    loading,
    error,
    creating,
    revokingId,
    loadShares,
    createShare,
    revokeShare,
  };
}
