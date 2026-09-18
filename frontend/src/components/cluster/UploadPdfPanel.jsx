import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Sparkles, Loader2, Layers, Rows3 } from "lucide-react";
import { api } from "@/lib/api";
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
// Multiple files now offer the same "Combine into this one test" /
// "Separate test per file" choice CreateMockTestModal already gives when
// creating a mock test from scratch - previously this panel always
// combined, with no way to get separate mock tests out of a template-
// created one without leaving this page and using "Add mock test" per
// file instead. "Combine" behaves exactly as before: merge everything and
// upload once, to THIS mock test. "Batch" uploads the first file to this
// (already-existing) mock test via the same onUpload this panel always
// used, and clones this mock test's own settings (marks, questionOrder,
// showMarksToStudents, and critically settings.templateId/sections/
// marking_scheme if this mock test came from a template) into a fresh
// mock test per remaining file - see handleSubmit's batch branch.
export default function UploadPdfPanel({
  mocktest,
  clusterId,
  isViewer,
  onUpload,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState("questions");
  // Only meaningful once 2+ files are selected - see the toggle rendered
  // below. Mirrors CreateMockTestModal's uploadMode exactly.
  const [uploadMode, setUploadMode] = useState("combine");
  // "combining" (client-side merge) happens before "uploading" (network) -
  // surfaced separately since a large merge can take a couple of seconds
  // on its own and "Uploading..." while nothing has hit the network yet
  // would be misleading.
  const [submitStage, setSubmitStage] = useState(null);
  const [uploadError, setUploadError] = useState("");
  // Only used mid-batch, to show "2 of 4..." instead of a single opaque
  // spinner for what can be a several-second loop of create+upload round
  // trips for every file after the first.
  const [batchProgress, setBatchProgress] = useState(null);

  const isBatchMode = uploadMode === "batch" && selectedFiles.length > 1;

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

    if (isBatchMode) {
      // Clones every setting this mock test already has - not just marks,
      // but settings wholesale, so a template-created mock test's
      // templateId/sections/marking_scheme (see mock-tests.service.js
      // #buildTemplateContext) carries through to every mock test this
      // batch creates, the same way it already applies to this one.
      const buildClonePayload = (name) => ({
        name,
        description: mocktest.description || "",
        durationMinutes:
          Number(mocktest.duration_minutes ?? mocktest.durationMinutes) ||
          120,
        marksPerCorrect: Number(
          mocktest.marks_per_correct ?? mocktest.marksPerCorrect ?? 1,
        ),
        negativeMarksPerWrong: Number(
          mocktest.negative_marks_per_wrong ??
            mocktest.negativeMarksPerWrong ??
            0,
        ),
        settings: mocktest.settings || {},
      });

      const [firstFile, ...restFiles] = selectedFiles;
      const prefix = mocktest.name || "";
      const created = [];
      const failures = [];
      setSubmitStage("uploading");
      setBatchProgress({ done: 0, total: selectedFiles.length });

      try {
        // File 1 goes to THIS mock test, via the exact same onUpload the
        // non-batch path already uses (parent's handleUpload - switches
        // this page to the Processing tab once it's done). Its own
        // errors surface the same way a single-file upload's already do
        // today (parent's actionError, shown elsewhere on this page) -
        // not caught here, matching existing non-batch behavior for this
        // panel rather than introducing new handling for the one file
        // that isn't a fresh create.
        const firstPdf = isPdfFile(firstFile)
          ? firstFile
          : await ensureSingleFileIsPdf(firstFile);
        await onUpload(firstPdf, documentType);
        created.push(mocktest);
      } finally {
        setBatchProgress((current) => ({
          done: (current?.done || 0) + 1,
          total: selectedFiles.length,
        }));
      }

      // Sequential, not Promise.all - real create+upload round trips per
      // file, same reasoning as CreateMockTestModal's own batch loop. One
      // bad file doesn't lose the mock tests already created for the
      // files before it.
      for (const file of restFiles) {
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const testName = prefix ? `${prefix} - ${baseName}` : baseName;
        try {
          const pdfFile = await ensureSingleFileIsPdf(file);
          const result = await api.createMockTest(
            clusterId,
            buildClonePayload(testName),
          );
          await api.uploadMockTestDocument(
            result.mockTest.id,
            pdfFile,
            documentType,
          );
          created.push(result.mockTest);
        } catch (fileError) {
          failures.push({
            fileName: file.name,
            message: fileError.message || "Failed",
          });
        } finally {
          setBatchProgress((current) => ({
            done: (current?.done || 0) + 1,
            total: selectedFiles.length,
          }));
        }
      }

      setSubmitStage(null);

      await queryClient.invalidateQueries({
        queryKey: ["mock-tests", clusterId],
      });
      await queryClient.invalidateQueries({ queryKey: ["clusters"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });

      if (failures.length > 0) {
        // At least the first file (this mock test) always "succeeds" by
        // this point, or onUpload would have thrown before reaching here
        // - so this is always a partial-failure summary, never a total
        // one, unlike CreateMockTestModal's from-scratch batch.
        window.alert(
          `Uploaded ${created.length} of ${selectedFiles.length} files.\n\nFailed:\n` +
            failures.map((f) => `- ${f.fileName}: ${f.message}`).join("\n"),
        );
      }

      // Away from this single mock test's page to the cluster view - the
      // newly created mock tests aren't visible from here otherwise, same
      // destination CreateMockTestModal's batch mode navigates to.
      navigate(`/cluster/${clusterId}`);
      return;
    }

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
              ? "Choose below whether to combine these or make separate mock tests."
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

        {selectedFiles.length > 1 && (
          <div>
            <p className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Multiple files - how should these become mock tests?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUploadMode("combine")}
                className={`flex flex-col items-center gap-1.5 rounded-md border-2 px-2 py-3 text-center transition-all ${
                  uploadMode === "combine"
                    ? "border-orange-500/60 bg-orange-500/10"
                    : "border-border bg-muted/40 hover:border-orange-500/30"
                }`}
              >
                <Layers className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-semibold text-foreground">
                  Combine into this one test
                </span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("batch")}
                className={`flex flex-col items-center gap-1.5 rounded-md border-2 px-2 py-3 text-center transition-all ${
                  uploadMode === "batch"
                    ? "border-orange-500/60 bg-orange-500/10"
                    : "border-border bg-muted/40 hover:border-orange-500/30"
                }`}
              >
                <Rows3 className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-semibold text-foreground">
                  Separate test per file
                </span>
              </button>
            </div>
            {isBatchMode && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                The first file uploads to this mock test. Each other file
                becomes its own new mock test, named after the file (this
                mock test's name is used as a prefix) and cloned from this
                one's duration, marking and template settings.
              </p>
            )}
          </div>
        )}

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
                {submitStage === "combining"
                  ? "Combining..."
                  : isBatchMode && batchProgress
                    ? `Uploading ${batchProgress.done} of ${batchProgress.total}...`
                    : "Uploading..."}
              </span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>
                {isBatchMode
                  ? `Upload & Create ${selectedFiles.length} Mock Tests`
                  : "Upload & Start Extraction"}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
