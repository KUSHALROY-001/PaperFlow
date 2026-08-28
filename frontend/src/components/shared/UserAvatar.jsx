import { initialsFor, avatarColorFor } from "@/utils/teamHelpers";

/**
 * Circular avatar that prefers a photo URL, falling back to colored
 * initials. Used in the top nav, team roster, students list, and
 * invitations so every surface that shows a person looks the same.
 */
export default function UserAvatar({
  src,
  name,
  seed,
  size = "md",
  className = "",
  rounded = "full",
}) {
  const sizeClass =
    size === "sm"
      ? "w-6 h-6 text-xs"
      : size === "lg"
        ? "w-12 h-12 text-base"
        : size === "xl"
          ? "w-16 h-16 text-lg"
          : "w-10 h-10 text-sm";

  const radiusClass =
    rounded === "xl"
      ? "rounded-xl"
      : rounded === "3xl"
        ? "rounded-3xl"
        : "rounded-full";

  const colorSeed = seed || name || "?";
  const initials = initialsFor(name);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={`${sizeClass} ${radiusClass} object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${radiusClass} ${avatarColorFor(colorSeed)} flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
