import { useState } from "react";
import {
  ExternalLink,
  CheckCircle,
  Zap,
  Download,
  RefreshCw,
  Lock,
} from "lucide-react";

const integrations = [
  {
    id: "google_classroom",
    name: "Google Classroom",
    description:
      "Push generated mock tests directly to your Google Classroom as assignments.",
    icon: "🎓",
    category: "LMS",
    status: "connected",
    connected_as: "arjun@school.edu",
    actions: ["Sync Classrooms", "Push Mock Test", "Disconnect"],
  },
  {
    id: "anki",
    name: "Anki",
    description:
      "Export extracted Q&A pairs as Anki flashcard decks (.apkg) for spaced repetition.",
    icon: "🃏",
    category: "Flashcards",
    status: "available",
    actions: ["Export as .apkg"],
  },
  {
    id: "quizlet",
    name: "Quizlet",
    description:
      "Create Quizlet study sets directly from your cluster questions.",
    icon: "Q",
    category: "Flashcards",
    status: "available",
    actions: ["Create Study Set"],
  },
  {
    id: "moodle",
    name: "Moodle",
    description:
      "Export quiz XML that can be directly imported into Moodle LMS.",
    icon: "🦉",
    category: "LMS",
    status: "available",
    actions: ["Export Moodle XML"],
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Export question banks as Notion databases with topic, difficulty, and answer columns.",
    icon: "◻",
    category: "Productivity",
    status: "available",
    actions: ["Export to Notion"],
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Get notified on Slack when a cluster finishes processing or needs review.",
    icon: "💬",
    category: "Notifications",
    status: "available",
    actions: ["Connect Workspace"],
  },
  {
    id: "webhook",
    name: "Webhooks",
    description:
      "Send cluster output JSON to any URL when processing completes.",
    icon: "🔗",
    category: "Developer",
    status: "configured",
    webhook_url: "https://api.example.com/mockcraft",
    actions: ["Edit URL", "Test Webhook"],
  },
  {
    id: "json_export",
    name: "REST API",
    description:
      "Access all clusters and question data programmatically via the MockCraft REST API.",
    icon: "⚡",
    category: "Developer",
    status: "available",
    actions: ["View API Docs", "Get API Key"],
  },
];

const categoryColors = {
  LMS: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  Flashcards: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
  Productivity: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  Notifications: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  Developer: "bg-muted text-muted-foreground border border-border",
};

const categories = [
  "All",
  "LMS",
  "Flashcards",
  "Productivity",
  "Notifications",
  "Developer",
];

export default function Integrations() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [connecting, setConnecting] = useState(null);
  const [connected, setConnected] = useState({
    google_classroom: true,
    webhook: true,
  });

  const filtered = integrations.filter(
    (i) => activeCategory === "All" || i.category === activeCategory,
  );

  const handleConnect = (id) => {
    setConnecting(id);
    setTimeout(() => {
      setConnecting(null);
      setConnected((prev) => ({ ...prev, [id]: true }));
    }, 1500);
  };

  const getStatus = (integration) => {
    if (connected[integration.id]) return "connected";
    return integration.status;
  };

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Integrations</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Connect MockCraft to your favorite tools and platforms.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {Object.keys(connected).length}
          </div>
          <div className="text-xs text-muted-foreground font-medium">Connected</div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map((c) => {
          const active = activeCategory === c;
          return (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                active
                  ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/15 font-bold border border-orange-500/20"
                  : "bg-card border border-border text-muted-foreground hover:border-orange-500/40 hover:text-foreground"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Integrations grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((integration) => {
          const status = getStatus(integration);
          const isConnecting = connecting === integration.id;
          return (
            <div
              key={integration.id}
              className="surface-card rounded-2xl p-5 border border-border hover:border-orange-500/30 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-12 h-12 bg-orange-500/15 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  {integration.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-foreground">
                        {integration.name}
                      </h3>
                      <span
                        className={`inline-block text-[11px] px-2 py-0.5 mt-1 rounded-lg font-semibold ${categoryColors[integration.category]}`}
                      >
                        {integration.category}
                      </span>
                    </div>
                    {status === "connected" && (
                      <span className="flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold shrink-0">
                        <CheckCircle className="w-3.5 h-3.5" /> Connected
                      </span>
                    )}
                    {status === "configured" && (
                      <span className="flex items-center gap-1 text-xs bg-blue-500/15 text-blue-500 border border-blue-500/20 px-2.5 py-1 rounded-lg font-bold shrink-0">
                        <Zap className="w-3.5 h-3.5" /> Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {integration.description}
                  </p>

                  {integration.connected_as && status === "connected" && (
                    <p className="text-xs text-emerald-500 mt-1 font-semibold">
                      Signed in as {integration.connected_as}
                    </p>
                  )}
                  {integration.webhook_url && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                      {integration.webhook_url}
                    </p>
                  )}

                  <div className="flex gap-2 mt-4 flex-wrap">
                    {status === "available" ? (
                      <button
                        onClick={() => handleConnect(integration.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${isConnecting ? "bg-orange-500/20 text-orange-500 border border-orange-500/30" : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"}`}
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" /> Connect
                          </>
                        )}
                      </button>
                    ) : (
                      integration.actions?.slice(0, 2).map((action, i) => (
                        <button
                          key={i}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border text-foreground rounded-xl hover:bg-muted hover:border-orange-500/40 transition-all"
                        >
                          {action.includes("Export") ? (
                            <Download className="w-3.5 h-3.5 text-orange-500" />
                          ) : action.includes("Sync") ||
                            action.includes("View") ? (
                            <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-orange-500" />
                          )}
                          {action}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* API key section */}
      <div className="surface-card rounded-2xl p-6 border border-border">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground mb-1">API Key</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Use your API key to authenticate programmatic requests to the
              MockCraft REST API.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 overflow-hidden text-ellipsis text-xs font-mono bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground font-semibold">
                mc_live_••••••••••••••••••••••••••••••••
              </code>
              <button className="px-4 py-2.5 text-xs font-semibold bg-card border border-border text-foreground rounded-xl hover:bg-muted hover:border-orange-500/40 transition-all whitespace-nowrap">
                Reveal Key
              </button>
              <button className="px-4 py-2.5 text-xs font-semibold bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-xl shadow-xs transition-all whitespace-nowrap">
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
