import { Check, Monitor, Moon, SunMedium } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useTheme from "./useTheme";

export default function ThemeToggle({ className = "" }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const currentIcon = resolvedTheme === "dark" ? Moon : SunMedium;
  const CurrentIcon = currentIcon;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Choose color theme"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-3xl border border-border bg-card text-foreground transition-all hover:border-orange-500/40 hover:text-orange-500 ${className}`}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Color theme"
          className="absolute right-0 top-full z-50 mt-2 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {[
            { value: "light", label: "Light", icon: SunMedium },
            { value: "dark", label: "Dark", icon: Moon },
            { value: "system", label: "System", icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                theme === value
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {theme === value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
