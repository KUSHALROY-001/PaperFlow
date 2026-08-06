// Extracted from pages/Team.jsx — no behavior changes, except one fix (see
// avatarColorFor below).

// Backend role values (owner/admin/editor/viewer) vs display labels -
// "editor" is shown as "Reviewer" to match this page's existing copy
// ("edit clusters, review questions"), everything else maps 1:1.
export const ASSIGNABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Reviewer" },
  { value: "viewer", label: "Viewer" },
];

export const roleLabel = (role) =>
  role === "owner"
    ? "Owner"
    : ASSIGNABLE_ROLES.find((r) => r.value === role)?.label || role;

export const roleColors = {
  owner: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
  admin: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
  editor: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  viewer: "bg-muted text-muted-foreground border border-border",
};

const avatarColors = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
];

export function initialsFor(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Fixed: this used to be `avatarColors[i % avatarColors.length]` using the
// *filtered* list's index, so a member's avatar color could change while
// typing into search (their position in the filtered array shifts). Hashing
// on their id instead means the color is stable regardless of search/order.
export function avatarColorFor(id) {
  const hash = String(id)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}
