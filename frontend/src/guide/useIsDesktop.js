import { useEffect, useState } from "react";

// Mirrors the Tailwind `lg` breakpoint the sidebar itself uses
// (`hidden lg:flex` in AppShell.jsx) - steps that target the sidebar nav
// need to know this so they don't spotlight an element that's actually
// `display: none` on the current viewport.
const QUERY = "(min-width: 1024px)";

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia(QUERY);
    const handler = (event) => setIsDesktop(event.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}
