import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { mapTemplate, fieldClass, labelClass } from "@/utils/templateHelpers";

// One input (exam name only - v1 scope), a Generate button, and nothing
// else - no second validation path here, since the draft that comes back
// is run through the SAME mapTemplate() a real DB row already goes
// through (see extraction-templates.service.js#generateTemplateDraft,
// which already validated it against createTemplate's own rules
// server-side). onGenerated hands the mapped draft up to Templates.jsx,
// which opens it in the existing CreateTemplateModal for review before
// anything is actually saved.
export default function GenerateTemplateModal({ onClose, onBack, onGenerated }) {
  const [examName, setExamName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async (e) => {
    e.preventDefault();
    const trimmed = examName.trim();
    if (!trimmed) {
      setError("Enter an exam name to generate a draft from");
      return;
    }

    setError("");
    setIsGenerating(true);

    // First click after Render's worker has spun down often gets an edge
    // 429/502 before the process is up. The API already retries; this
    // extra loop covers the case where even that budget ran out but the
    // wake is still in progress — retrying here is what actually succeeds.
    const maxAttempts = 4;
    const retryDelaysMs = [8000, 12000, 20000];
    let lastMessage = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { template } = await api.generateExtractionTemplate(trimmed);
        onGenerated(mapTemplate(template));
        return;
      } catch (generateError) {
        const status = generateError.status;
        const retryable = [429, 502, 503, 504].includes(status);
        lastMessage =
          generateError.message || "Could not generate a template draft";

        if (!retryable || attempt === maxAttempts) {
          setError(lastMessage);
          setIsGenerating(false);
          return;
        }

        setError(
          "The AI service is waking up after being idle — retrying shortly…",
        );
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelaysMs[attempt - 1] || 15000),
        );
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isGenerating) onClose();
      }}
      role="presentation"
    >
      <form
        onSubmit={handleGenerate}
        className="w-full max-w-lg surface-card border border-border rounded-3xl shadow-2xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-orange-500" />
              Build with AI
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Tell us the exam and we'll draft a template — sections,
              marks, and duration — based on its real pattern. You'll
              review and can change everything before saving.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className={labelClass}>Exam name</label>
          <input
            autoFocus
            disabled={isGenerating}
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            placeholder='e.g. "JEE Main", "SSC CGL", "Class 10 Physics Half-Yearly"'
            className={fieldClass}
          />
        </div>

        {isGenerating && (
          <p className="text-xs text-muted-foreground mt-3">
            This can take a minute if the AI service has been idle — it
            may need to wake up first. Hang tight.
          </p>
        )}

        {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onBack}
            disabled={isGenerating}
            className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-md hover:bg-muted text-xs sm:text-sm transition-all disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 font-bold text-xs sm:text-sm transition-all bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Generating...</span>
              </>
            ) : (
              <span>Generate</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
