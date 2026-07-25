import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function PlaceholderPage({ eyebrow, title, description }) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 dark:bg-orange-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-500">
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card rounded-3xl p-8 border border-border">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Section scaffolded</h2>
          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            This route is now connected to the shared shell so your navigation works end to end. You can replace this panel with live backend data whenever that part of the app is ready.
          </p>
          <div className="mt-6 rounded-2xl border border-dashed border-orange-500/30 bg-orange-500/10 dark:bg-orange-500/15 p-5 text-xs sm:text-sm text-muted-foreground">
            Suggested next step: connect this page to your API or data store, then keep the same visual language for cards, filters, and actions.
          </div>
        </div>

        <div className="surface-card rounded-3xl border border-border p-8">
          <h3 className="text-lg font-bold text-foreground">Quick jump</h3>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
            Open the live cluster workspace to review processing, extracted questions, and JSON output.
          </p>
          <Link
            to="/cluster/c1"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold text-white transition-all bg-[#ea580c] hover:bg-[#c2410c] shadow-xs"
          >
            Open Demo Cluster <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
