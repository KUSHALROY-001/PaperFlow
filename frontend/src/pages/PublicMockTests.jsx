import { useState } from "react";
import { Globe, Building2 } from "lucide-react";
import CatalogBrowser from "@/components/catalog/CatalogBrowser";
import CatalogSettingsPanel from "@/components/catalog/CatalogSettingsPanel";

export default function PublicMockTests() {
  const [activeTab, setActiveTab] = useState("public");
  const isPublicTab = activeTab === "public";

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-orange-500" />
          Public Mock Tests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse every institute's free mock tests, or manage which of your own
          tests are publicly listed.
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setActiveTab("public")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isPublicTab
              ? "bg-orange-500 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Public Mock Tests
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("own")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            !isPublicTab
              ? "bg-orange-500 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Own Mock Tests
        </button>
      </div>

      {isPublicTab ? <CatalogBrowser /> : <CatalogSettingsPanel />}
    </div>
  );
}
