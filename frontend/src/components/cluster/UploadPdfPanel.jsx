import { useState } from "react";
import { Upload, Sparkles } from "lucide-react";

// Shown on the Overview tab when a mock test exists but no PDF has ever
// been uploaded to it - the gap left by the "Apply Template" flow, which
// creates the mock test pre-filled with the template's marking scheme but
// deliberately stops short of asking for a file (see ApplyTemplateModal).
// Mirrors the file picker + Question Paper/Notes toggle from
// CreateMockTestModal, since that's the only other place this exists.
export default function UploadPdfPanel({ mocktest, isViewer, onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState("questions");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const templateName = mocktest?.settings?.templateName;
  const expectedQuestionCount = mocktest?.settings?.expectedQuestionCount;
  // settings.sections holds structured { name, topics, ... } objects (see
  // 010_extraction_templates_syllabus.sql), not the flat topic-name strings
  // it used to - flatten to a plain topic list for this one-line summary.
  const sections = Array.isArray(mocktest?.settings?.sections)
    ? mocktest.settings.sections
    : [];
  const syllabusTopics = [
    ...new Set(
      sections.flatMap((section) =>
        Array.isArray(section?.topics) ? section.topics : [],
      ),
    ),
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isViewer || !selectedFile) return;

    setIsSubmitting(true);
    try {
      await onUpload(selectedFile, documentType);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="surface-card rounded-2xl p-4 sm:p-6 border border-dashed border-orange-500/30">
      {templateName && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <Sparkles className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <div className="text-xs sm:text-sm text-foreground">
            <span className="font-bold">{templateName}</span> applied
            {expectedQuestionCount ? (
              <>
                {" "}
                — expects ~{expectedQuestionCount} question
                {expectedQuestionCount === 1 ? "" : "s"}
              </>
            ) : null}
            {syllabusTopics.length > 0 && (
              <p className="text-muted-foreground mt-1">
                Syllabus: {syllabusTopics.join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      <h3 className="font-bold text-foreground mb-1">Upload the PDF</h3>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        This mock test doesn't have a document yet. Upload a PDF to start
        extraction.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all ${
            isViewer
              ? "border-border bg-muted/40 cursor-not-allowed opacity-50"
              : "border-border bg-muted/40 hover:border-orange-500/40 hover:bg-muted cursor-pointer"
          }`}
        >
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
            disabled={isViewer}
            className="hidden"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] || null)
            }
          />
        </label>

        {selectedFile && (
          <div>
            <label className="mb-2 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
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

        <button
          type="submit"
          disabled={isSubmitting || isViewer || !selectedFile}
          title={isViewer ? "Editor role is required to upload" : undefined}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 font-semibold rounded-xl shadow-xs transition-all text-xs sm:text-sm ${
            isViewer || !selectedFile
              ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
              : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
          }`}
        >
          <Upload className="w-4 h-4" />
          {isSubmitting ? "Uploading..." : "Upload & Start Extraction"}
        </button>
      </form>
    </div>
  );
}
