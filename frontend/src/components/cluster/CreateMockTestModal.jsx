import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Sparkles, FileText, FilePlus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const MIN_GENERATED_QUESTIONS = 5;
const MAX_GENERATED_QUESTIONS = 200;
const DIFFICULTY_OPTIONS = ["Variable", "Easy", "Medium", "Hard"];

// Promoted from an inline component inside pages/ClusterWorkspace.jsx — no behavior changes.
export default function CreateMockTestModal({ clusterId, onClose }) {
  const { isViewer } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
    durationMinutes: 120,
  });
  // "blank" - no content attached, same as leaving the file picker empty
  // always used to mean. "upload" / "generate" just swap which panel
  // below collects the extra input each mode needs.
  const [mode, setMode] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState("questions");
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [targetQuestionCount, setTargetQuestionCount] = useState(50);
  const [difficultyHint, setDifficultyHint] = useState("Variable");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Workspace-wide, not cluster-scoped - a generated test can draw its
  // shape from a source test in any cluster, not just this one. Only
  // fetched once the user actually opens the "Generate" panel, since
  // most modal opens never need this list at all.
  const { data: allMockTestsData, isLoading: isLoadingSources } = useQuery({
    queryKey: ["mock-tests", "all"],
    queryFn: () => api.listAllMockTests(),
    enabled: mode === "generate",
  });
  // Only tests that actually have questions are worth offering as a
  // source - getTopicDistributionForMockTests would just come back empty
  // for one with none, and generateFromExisting rejects that server-side
  // anyway (see mock-tests.service.js), so filtering here is purely to
  // stop the user from selecting a source that's guaranteed to fail.
  const availableSources = (allMockTestsData?.mockTests || []).filter(
    (test) => Number(test.total_questions || 0) > 0,
  );

  const toggleSource = (mockTestId) => {
    setSelectedSourceIds((current) =>
      current.includes(mockTestId)
        ? current.filter((id) => id !== mockTestId)
        : [...current, mockTestId],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (mode === "generate" && selectedSourceIds.length === 0) {
      setError("Select at least one source mock test to generate from");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await api.createMockTest(clusterId, {
        name: form.name,
        description: form.description,
        durationMinutes: Number(form.durationMinutes),
      });

      if (mode === "upload" && selectedFile) {
        await api.uploadMockTestDocument(
          result.mockTest.id,
          selectedFile,
          documentType,
        );
      } else if (mode === "generate") {
        await api.generateMockTestFromExisting(result.mockTest.id, {
          sourceMockTestIds: selectedSourceIds,
          targetQuestionCount: Number(targetQuestionCount),
          difficultyHint,
        });
      }

      const willProcess =
        (mode === "upload" && selectedFile) || mode === "generate";

      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onClose();
      navigate(
        `/cluster/${clusterId}/mocktest/${result.mockTest.id}?tab=${willProcess ? "processing" : "overview"}`,
      );
    } catch (submitError) {
      setError(submitError.message || "Could not create mock test");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl surface-card border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Add Mock Test</h2>
            <p className="text-xs text-muted-foreground">
              Create a mock test inside this cluster.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 overflow-y-auto p-5 sm:p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Mock Test Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="e.g. JECA PYQ 2024"
              className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              placeholder="Optional notes for this mock test"
              className="w-full resize-none rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Duration Minutes
            </label>
            <input
              type="number"
              min="1"
              value={form.durationMinutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  durationMinutes: event.target.value,
                }))
              }
              className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              How should this test get its questions?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                  mode === "upload"
                    ? "border-orange-500/60 bg-orange-500/10"
                    : "border-border bg-muted/40 hover:border-orange-500/30"
                }`}
              >
                <FileText className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-semibold text-foreground">
                  Upload PDF
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("generate")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                  mode === "generate"
                    ? "border-orange-500/60 bg-orange-500/10"
                    : "border-border bg-muted/40 hover:border-orange-500/30"
                }`}
              >
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-semibold text-foreground">
                  Generate New
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("blank")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                  mode === "blank"
                    ? "border-orange-500/60 bg-orange-500/10"
                    : "border-border bg-muted/40 hover:border-orange-500/30"
                }`}
              >
                <FilePlus className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-semibold text-foreground">
                  Start Blank
                </span>
              </button>
            </div>
          </div>

          {mode === "upload" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Upload Document
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-all hover:border-orange-500/40 hover:bg-muted">
                <Upload className="mb-3 h-6 w-6 text-orange-500" />
                <span className="max-w-full break-all text-sm font-semibold text-foreground">
                  {selectedFile ? selectedFile.name : "Choose PDF document"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  We'll extract questions automatically after upload.
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setSelectedFile(file);
                    if (file && !form.name.trim()) {
                      setForm((current) => ({
                        ...current,
                        name: file.name.replace(/\.pdf$/i, ""),
                      }));
                    }
                  }}
                />
              </label>
              {selectedFile && (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  <span className="truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="font-semibold text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === "upload" && selectedFile && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                What's in this PDF?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDocumentType("questions")}
                  className={`rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    documentType === "questions"
                      ? "border-orange-500/60 bg-orange-500/10"
                      : "border-border bg-muted/40 hover:border-orange-500/30"
                  }`}
                >
                  <span className="block text-sm font-semibold text-foreground">
                    Question Paper
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Already has ready-made questions &amp; options
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentType("notes")}
                  className={`rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    documentType === "notes"
                      ? "border-orange-500/60 bg-orange-500/10"
                      : "border-border bg-muted/40 hover:border-orange-500/30"
                  }`}
                >
                  <span className="block text-sm font-semibold text-foreground">
                    Study Notes
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    No questions yet — generate a quiz from this
                  </span>
                </button>
              </div>
            </div>
          )}

          {mode === "generate" && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Generate from which mock test(s)? *
                </label>
                <p className="mb-2 text-xs text-muted-foreground">
                  The AI only sees these tests' topic breakdown and marking
                  scheme — never the actual questions — so it writes a brand-new
                  test with the same shape, not copies.
                </p>
                <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-muted/30 p-2">
                  {isLoadingSources && (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                      Loading mock tests…
                    </p>
                  )}
                  {!isLoadingSources && availableSources.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                      No mock tests with questions yet to generate from.
                    </p>
                  )}
                  {availableSources.map((test) => (
                    <label
                      key={test.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-all ${
                        selectedSourceIds.includes(test.id)
                          ? "border-orange-500/50 bg-orange-500/10"
                          : "border-transparent hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSourceIds.includes(test.id)}
                        onChange={() => toggleSource(test.id)}
                        className="h-4 w-4 shrink-0 rounded border-border accent-orange-500"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {test.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {test.total_questions} question(s)
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Question Count
                  </label>
                  <input
                    type="number"
                    min={MIN_GENERATED_QUESTIONS}
                    max={MAX_GENERATED_QUESTIONS}
                    value={targetQuestionCount}
                    onChange={(event) =>
                      setTargetQuestionCount(event.target.value)
                    }
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {MIN_GENERATED_QUESTIONS}–{MAX_GENERATED_QUESTIONS}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Difficulty
                  </label>
                  <select
                    value={difficultyHint}
                    onChange={(event) => setDifficultyHint(event.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
                  >
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isViewer}
              title={
                isViewer
                  ? "Editor role is required to add mock tests"
                  : undefined
              }
              className={`flex-1 rounded-md py-2.5 text-sm font-semibold text-white transition-all shadow-sm ${
                isViewer
                  ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isSubmitting
                ? mode === "generate"
                  ? "Generating..."
                  : "Creating..."
                : "Add Mock Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
