import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

function StatTile({
  label,
  value,
  description,
  icon: Icon,
  to,
  onClick,
  className,
}) {
  const interactive = Boolean(to || onClick);
  let Comp;
  if (to) {
    Comp = Link;
  } else if (onClick) {
    Comp = "button";
  } else {
    Comp = "div";
  }

  return (
    <Comp
      to={to}
      onClick={onClick}
      className={cn(
        "group flex min-h-32 w-full flex-col rounded-lg border bg-card p-5 text-left text-card-foreground transition-colors duration-200",
        interactive &&
          "hover:bg-hover-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        {Icon ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        {interactive ? (
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        ) : null}
      </div>
      <div className="number-mono text-3xl font-semibold tracking-tight">
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-muted-foreground">
        {label}
      </div>
      {description ? (
        <p className="mt-3 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </Comp>
  );
}

export { StatTile };
