import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// Used in Output/Review/Submissions - the tabs with the longest scrollable
// content (full question lists, submission grids). Hidden until the page
// is actually scrolled past `threshold`, so it doesn't sit redundantly
// next to content that's already at the top. main (AppShell.jsx) has no
// overflow-y-auto of its own, so the real scroll container is the window -
// window.scrollY/scrollTo are correct here, not a ref to some inner div.
export default function ScrollToTopButton({ threshold = 400 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > threshold);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-all hover:border-orange-500/40 hover:text-orange-500 hover:-translate-y-0.5"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
