import { Upload, Layers, Rows3 } from "lucide-react";
import {
  NOTES_QUESTION_COUNT_MAX,
  NOTES_QUESTION_COUNT_MIN,
} from "@/utils/notesQuestionCount";
import MultiFileList from "./MultiFileList";

export default function CreateMockTestUploadPanel({
  selectedFiles,
  onFilesPicked,
  onReorderFiles,
  onRemoveFile,
  uploadMode,
  setUploadMode,
  isBatchMode,
  documentType,
  setDocumentType,
  desiredQuestionCount,
  setDesiredQuestionCount,
}) {
  return (
    <>
      <div>
        <p className="mb-2 block text-sm font-semibold text-foreground">
          Upload Document{selectedFiles.length > 1 ? "s" : ""}
        </p>
        <label
          data-tour="mock-upload"
          data-has-files={selectedFiles.length > 0}
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-all hover:border-orange-500/40 hover:bg-muted"
        >
          <Upload className="mb-3 h-6 w-6 text-orange-500" />
          <span className="max-w-full break-all text-sm font-semibold text-foreground">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected`
              : "Choose PDF, Word, PowerPoint, or image files"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            We'll extract questions automatically after upload.
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf,image/*,.doc,.docx,.ppt,.pptx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            multiple
            className="hidden"
            onChange={(event) => {
              const picked = Array.from(event.target.files || []);
              // Selection is additive (repeated picks keep adding, not
              // replacing) - reset so choosing the same file(s) again
              // still fires onChange.
              event.target.value = "";
              onFilesPicked(picked);
            }}
          />
        </label>

        <MultiFileList
          files={selectedFiles}
          onReorder={onReorderFiles}
          onRemove={onRemoveFile}
        />

        {selectedFiles.length > 1 && (
          <div className="mt-3">
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
                Each file becomes its own mock test, named after the file
                (the Name field above is used as an optional prefix).
                Duration, marking and other settings below apply to all of
                them.
              </p>
            )}
          </div>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div>
          <p className="mb-2 block text-sm font-semibold text-foreground">
            What's in {selectedFiles.length > 1 ? "these files" : "this PDF"}?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setDocumentType("questions");
                setDesiredQuestionCount("");
              }}
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
          {documentType === "notes" && (
            <div className="mt-3">
              <label
                htmlFor="create-notes-desired-question-count"
                className="mb-2 block text-sm font-semibold text-foreground"
              >
                How many questions? (optional)
              </label>
              <input
                id="create-notes-desired-question-count"
                type="number"
                min={NOTES_QUESTION_COUNT_MIN}
                max={NOTES_QUESTION_COUNT_MAX}
                inputMode="numeric"
                value={desiredQuestionCount}
                onChange={(event) =>
                  setDesiredQuestionCount(event.target.value)
                }
                placeholder="Leave blank to auto-size"
                className="w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {NOTES_QUESTION_COUNT_MIN}–{NOTES_QUESTION_COUNT_MAX}.
                Questions are sampled across the whole document, not just
                the first pages.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
