import { useState } from "react";
import { Star, X } from "lucide-react";

// Interactive 1-5 star picker. Controlled by `value` (the user's own
// current rating, or null if they haven't rated yet) - clicking a star
// calls onRate(n); a small "remove" affordance next to the stars calls
// onRemove, shown only once the user has actually rated (nothing to
// remove otherwise).
//
// Kept deliberately separate from the read-only average+count display
// elsewhere (TemplateCard.jsx/PopularTemplateCard.jsx just render
// `template.rating`/`ratingCount` directly as plain text+icon, no need
// for this component's hover/click state there) - this one is only for
// the place a user actually submits a rating, currently
// TemplatePreviewModal.jsx.
export default function StarRatingInput({
  value,
  onRate,
  onRemove,
  disabled,
}) {
  const [hovered, setHovered] = useState(null);
  const displayValue = hovered ?? value ?? 0;

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHovered(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHovered(star)}
            onClick={() => !disabled && onRate(star)}
            title={`Rate ${star} star${star === 1 ? "" : "s"}`}
            className={`p-0.5 transition-transform ${
              disabled ? "cursor-not-allowed" : "hover:scale-110"
            }`}
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                star <= displayValue
                  ? "text-amber-500 fill-amber-500"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>
      {value != null && !disabled && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove your rating"
          className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
