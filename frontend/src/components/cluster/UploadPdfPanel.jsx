import { useState } from "react";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import {
  mergeFilesToPdf,
  ensureSingleFileIsPdf,
  isPdfFile,
  PdfAssemblyError,
} from "@/lib/pdfAssembly";
import MultiFileList from "./MultiFileList";

// Shown on the Overview tab when a mock test exists but no PDF has ever
// been uploaded to it - the gap left by the "Apply Template" flow, which
// creates the mock test pre-filled with the template's marking scheme but
// deliberately stops short of asking for a file (see ApplyTemplateModal).
// Mirrors the file picker + Question Paper/Notes toggle from
// CreateMockTestModal, since that's the only other place this exists.
//
// Multiple files (PDFs and/or images) are always COMBINED here, never
// batched into separate mock tests - this panel is already scoped to one
// existing mock test, so there's no ambiguity about what multiple files
// mean the way there is in CreateMockTestModal (which can create several
// new mock tests at once). Selecting several photographed pages, or a
// couple of PDFs, just merges them into one document in the order shown
// below before it's uploaded - see lib/pdfAssembly.js. The backend/worker
// never sees more than one file or knows images were involved at all.
export default function UploadPdfPanel({ mocktest, isViewer, onUpload }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState("questions");
  // "combining" (client-side merge) happens before "uploading" (network) -
  // surfaced separately since a large merge can take a couple of seconds
  // on its own and "Uploading..." while nothing has hit the network yet
  // would be misleading.
  const [submitStage, setSubmitStage] = useState(null);
  const [uploadError, setUploadError] = useState("");

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

  const addFiles = (fileList) => {
    const picked = Array.from(fileList || []);
    if (picked.length === 0) return;
    setSelectedFiles((current) => [...current, ...picked]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isViewer || selectedFiles.length === 0) return;

    setUploadError("");
    try {
      // A single, already-PDF file skips pdf-lib entirely and goes
      // straight through unchanged - exactly today's behavior, no
      // round-trip risk for the common case. Anything else (a lone image,
      // or 2+ files of any mix) needs assembly first, since the backend
      // only ever accepts a single valid PDF.
      const singleFile = selectedFiles.length === 1 ? selectedFiles[0] : null;
      const needsAssembly = !singleFile || !isPdfFile(singleFile);

      setSubmitStage(needsAssembly ? "combining" : "uploading");
      const fileToUpload = !needsAssembly
        ? singleFile
        : singleFile
          ? await ensureSingleFileIsPdf(singleFile)
          : await mergeFilesToPdf(selectedFiles);

      setSubmitStage("uploading");
      await onUpload(fileToUpload, documentType);
    } catch (err) {
      setUploadError(
        err instanceof PdfAssemblyError
          ? err.message
          : err.message || "Could not upload document to cloud storage",
      );
    } finally {
      setSubmitStage(null);
    }
  };

  const isSubmitting = submitStage !== null;

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
        This mock test doesn't have a document yet. Upload a PDF, or one or more
        photos of pages, to start extraction.
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
            {selectedFiles.length > 0
              ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected`
              : "Choose PDF or image files"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {selectedFiles.length > 1
              ? "We'll combine these into one document, in the order below."
              : "We'll extract questions automatically after upload."}
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf,image/*"
            multiple
            disabled={isViewer}
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);
              // Reset so picking the same file(s) again still fires
              // onChange - files are additive (see addFiles above), not a
              // replace-on-reselect picker.
              event.target.value = "";
            }}
          />
        </label>

        <MultiFileList
          files={selectedFiles}
          onReorder={setSelectedFiles}
          onRemove={(index) =>
            setSelectedFiles((current) => current.filter((_, i) => i !== index))
          }
        />

        {selectedFiles.length > 0 && (
          <div>
            <p className="mb-2 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              What's in {selectedFiles.length > 1 ? "these files" : "this PDF"}?
            </p>
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

        {uploadError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
            {uploadError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isViewer || selectedFiles.length === 0}
          title={isViewer ? "Editor role is required to upload" : undefined}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 font-semibold rounded-xl shadow-xs transition-all text-xs sm:text-sm ${
            isViewer || selectedFiles.length === 0
              ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
              : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                {submitStage === "combining" ? "Combining..." : "Uploading..."}
              </span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload & Start Extraction</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
