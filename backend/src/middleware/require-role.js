import { httpError } from "../lib/http-error.js";

// Role hierarchy, low to high. requireRole('editor') means "editor or higher".
const ROLE_RANK = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

/**
 * Must run after requireAuth (needs req.user.role to be set).
 * Usage: router.delete('/:id', requireRole('admin'), handler)
 */
export function requireRole(minimumRole) {
  const minimumRank = ROLE_RANK[minimumRole];

  if (minimumRank === undefined) {
    throw new Error(`Unknown role in requireRole: ${minimumRole}`);
  }

  return (req, _res, next) => {
    const userRank = ROLE_RANK[req.user?.role];

    if (userRank === undefined || userRank < minimumRank) {
      next(
        httpError(
          403,
          `This action requires the '${minimumRole}' role or higher`,
        ),
      );
      return;
    }

    next();
  };
}
