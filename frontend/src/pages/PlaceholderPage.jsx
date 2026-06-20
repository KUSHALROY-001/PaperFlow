import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function PlaceholderPage({ eyebrow, title, description }) {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card-lavender rounded-3xl p-8">
          <h2 className="text-xl font-bold text-foreground">Section scaffolded</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This route is now connected to the shared shell so your navigation works end to end. You can replace this panel with live backend data whenever that part of the app is ready.
          </p>
          <div className="mt-6 rounded-2xl border border-dashed border-violet-200 bg-violet-50/70 p-5 text-sm text-muted-foreground">
            Suggested next step: connect this page to your API or data store, then keep the same visual language for cards, filters, and actions.
          </div>
        </div>

        <div className="gradient-card rounded-3xl border border-violet-200 p-8">
          <h3 className="text-lg font-bold text-foreground">Quick jump</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Open the live cluster workspace to review processing, extracted questions, and JSON output.
          </p>
          <Link
            to="/cluster/c1"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 gradient-violet"
          >
            Open Demo Cluster <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
