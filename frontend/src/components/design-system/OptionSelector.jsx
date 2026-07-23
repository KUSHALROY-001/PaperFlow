import { cn } from "@/lib/utils";

function OptionSelector({
  optionKey,
  children,
  checked = false,
  disabled = false,
  onSelect,
  className,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border bg-background p-4 text-left transition-colors",
        "hover:bg-hover-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked && "border-primary bg-accent",
        disabled && "cursor-not-allowed bg-disabled text-disabled-foreground",
        className,
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "number-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground",
        )}
      >
        {optionKey}
      </span>
      <span className="text-sm text-foreground">{children}</span>
    </button>
  );
}

export { OptionSelector };
