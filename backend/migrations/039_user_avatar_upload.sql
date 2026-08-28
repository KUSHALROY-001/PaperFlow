-- Adds support for a self-uploaded profile avatar (Settings > Profile),
-- layered on top of the avatar_url column 038_google_sign_in.sql already
-- added for Google's profile photo.
--
-- avatar_url keeps meaning exactly what it already means today: whatever
-- external URL Google (or, later, another provider) supplied at sign-in,
-- untouched by uploading or removing a custom avatar.
--
-- avatar_public_id, when set, points to a Cloudinary asset the user
-- uploaded themselves and takes priority over avatar_url for what's
-- actually displayed - see cloudinary-storage.js#resolveAvatarUrl. Kept
-- as a separate column rather than overwriting avatar_url directly so
-- removing a custom avatar can cleanly fall back to the Google photo (or
-- no avatar) instead of having permanently discarded it.
--
-- avatar_updated_at is bumped only when avatar_public_id changes (upload
-- or removal), purely as a cache-busting version for the delivery URL -
-- same pattern diagram-cache-version.js#assetCacheVersion already uses
-- for question diagrams, reused directly rather than reinvented.
ALTER TABLE users
  ADD COLUMN avatar_public_id TEXT,
  ADD COLUMN avatar_updated_at TIMESTAMPTZ;
