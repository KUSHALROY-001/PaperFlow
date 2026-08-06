import { Settings as SettingsIcon, Save } from "lucide-react";

export default function PreferencesSection({
  prefs,
  setPrefs,
  isSavingPrefs,
  handleSavePrefs,
  saved,
}) {
  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 border border-border">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Preferences</h2>
      </div>

      <p className="text-xs text-muted-foreground bg-muted border border-border rounded-xl p-3 mb-4">
        These are saved to your account, but nothing else in MockCraft reads
        them automatically yet — uploads and notifications still use their own
        defaults. Worth knowing before you rely on them.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
            Default Output Type
          </label>
          <select
            value={prefs.defaultOutputFormat}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, defaultOutputFormat: e.target.value }))
            }
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
          >
            <option>Mock Test</option>
            <option>Question Bank</option>
            <option>Study Notes Extraction</option>
          </select>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
            OCR Language
          </label>
          <select
            value={prefs.ocrLanguage}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, ocrLanguage: e.target.value }))
            }
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
          >
            <option>English</option>
            <option>Hindi</option>
            <option>Bengali</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/60 rounded-xl border border-border">
          <div>
            <p className="text-xs sm:text-sm font-bold text-foreground">
              Email Notifications
            </p>
            <p className="text-xs text-muted-foreground">
              Get notified when processing completes
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPrefs((p) => ({
                ...p,
                emailNotifications: !p.emailNotifications,
              }))
            }
            className={`w-12 h-6 rounded-full transition-all shrink-0 ${prefs.emailNotifications ? "bg-[#ea580c]" : "bg-muted border border-border"}`}
          >
            <div
              className={`w-4 h-4 bg-card rounded-full shadow-md transition-transform mx-1 ${prefs.emailNotifications ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/60 rounded-xl border border-border">
          <div>
            <p className="text-xs sm:text-sm font-bold text-foreground">
              Auto-approve Extracted Questions
            </p>
            <p className="text-xs text-muted-foreground">
              Skip manual review after extraction
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPrefs((p) => ({ ...p, autoApprove: !p.autoApprove }))
            }
            className={`w-12 h-6 rounded-full transition-all shrink-0 ${prefs.autoApprove ? "bg-[#ea580c]" : "bg-muted border border-border"}`}
          >
            <div
              className={`w-4 h-4 bg-card rounded-full shadow-md transition-transform mx-1 ${prefs.autoApprove ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>

        <button
          onClick={handleSavePrefs}
          disabled={isSavingPrefs}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm disabled:opacity-60 ${saved === "prefs" ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"}`}
        >
          <Save className="w-4 h-4" />{" "}
          {isSavingPrefs
            ? "Saving..."
            : saved === "prefs"
              ? "Saved!"
              : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
