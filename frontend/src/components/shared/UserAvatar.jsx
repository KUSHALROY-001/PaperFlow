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
  let sizeClass;
  if (size === "sm") {
    sizeClass = "w-6 h-6 text-xs";
  } else if (size === "lg") {
    sizeClass = "w-12 h-12 text-base";
  } else if (size === "xl") {
    sizeClass = "w-16 h-16 text-lg";
  } else {
    sizeClass = "w-10 h-10 text-sm";
  }

  let radiusClass;
  if (rounded === "xl") {
    radiusClass = "rounded-xl";
  } else if (rounded === "3xl") {
    radiusClass = "rounded-3xl";
  } else {
    radiusClass = "rounded-full";
  }

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
