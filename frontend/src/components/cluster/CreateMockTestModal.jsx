import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

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
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState("questions");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await api.createMockTest(clusterId, {
        name: form.name,
        description: form.description,
        durationMinutes: Number(form.durationMinutes),
      });

      if (selectedFile) {
        await api.uploadMockTestDocument(
          result.mockTest.id,
          selectedFile,
          documentType,
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onClose();
      navigate(
        `/cluster/${clusterId}/mocktest/${result.mockTest.id}?tab=${selectedFile ? "processing" : "overview"}`,
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
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
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
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
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
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
            />
          </div>

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

          {selectedFile && (
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

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isViewer}
              title={
                isViewer ? "Editor role is required to add mock tests" : undefined
              }
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all shadow-sm ${
                isViewer
                  ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                  : "bg-[#ea580c] hover:bg-[#c2410c]"
              }`}
            >
              {isSubmitting ? "Creating..." : "Add Mock Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
