// Millisecond cache key for a diagram's current bytes. Replace and crop
// both overwrite the SAME Cloudinary public_id, so without a changing
// version the CDN and the browser keep serving the previous PNG after a
// successful upload. Derived from question_assets.created_at, which is
// bumped whenever the stored bytes change (INSERT on replace, touchAsset
// on crop). Milliseconds rather than unix seconds so a crop in the same
// second as a replace still gets a distinct URL.
export function assetCacheVersion(createdAt) {
  if (createdAt == null) return Date.now();
  const ms =
    createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (!Number.isFinite(ms)) return Date.now();
  return ms;
}
