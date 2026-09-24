import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { parseDesiredQuestionCount } from "@/utils/notesQuestionCount";
import {
  mergeFilesToPdf,
  ensureSingleFileIsPdf,
  isPdfFile,
  isOfficeDocFile,
  PdfAssemblyError,
} from "@/lib/pdfAssembly";

// Steps this form's fields are grouped into. Content Source comes FIRST,
// not Basics, because it decides what several later fields even mean -
// e.g. whether "Name" is required or just an optional batch-mode prefix
// (isBatchMode below) - see CreateMockTestModal.jsx's own comment for the
// full reasoning. Exported so the step indicator and the footer's
// Back/Next/Submit logic both read the same step count/order as this
// hook's own validation and navigation.
export const CREATE_MOCK_TEST_STEPS = [
  { id: 1, label: "Content" },
  { id: 2, label: "Basics" },
  { id: 3, label: "Settings" },
  { id: 4, label: "Review" },
];

// All state, derived values, and submit logic for CreateMockTestModal -
// split out of the view the same way useTemplateForm.js/useQuestionForm.js
// already split theirs for their own modals. The modal component and its
// per-step components only ever read from / call into what this hook
// returns; nothing here reaches back into JSX.
export function useCreateMockTestForm({ clusterId, onClose }) {
  const uid = useId();
  const { isViewer } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    durationMinutes: 120,
    marksPerCorrect: 1,
    negativeMarksPerWrong: 0.25,
    showMarksToStudents: false,
    // "sequential" = same order as in the uploaded/generated paper
    // (questionNo ASC); "random" = shuffled per student per attempt, same
    // shuffle kept for that attempt's whole lifetime (resume, review) -
    // see attempts.service.js#startAttempt. Changeable later from
    // MockTestScoringPanel, which is why this lives in settings rather
    // than its own mock_tests column - same pattern showMarksToStudents
    // already uses.
    questionOrder: "sequential",
  });
  // Single patch-merge updater so step components never touch raw setForm
  // (and so a step can't accidentally overwrite a field it doesn't own) -
  // every field change from every step component goes through this.
  const updateForm = (patch) =>
    setForm((current) => ({ ...current, ...patch }));

  // "blank" - no content attached, same as leaving the file picker empty
  // always used to mean. "upload" / "generate" just swap which panel
  // collects the extra input each mode needs.
  const [mode, setMode] = useState("upload");
  const [selectedFiles, setSelectedFiles] = useState([]);
  // Only meaningful once 2+ files are selected in "upload" mode. "combine"
  // merges everything into the ONE mock test this form is already
  // creating (lib/pdfAssembly.js#mergeFilesToPdf). "batch" instead creates
  // a SEPARATE mock test per file, looping the same create-then-upload
  // calls this form already makes for a single file - see handleSubmit's
  // batch branch.
  const [uploadMode, setUploadMode] = useState("combine");
  const [documentType, setDocumentType] = useState("questions");
  const [desiredQuestionCount, setDesiredQuestionCount] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [targetQuestionCount, setTargetQuestionCount] = useState(50);
  const [difficultyHint, setDifficultyHint] = useState("Variable");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Only used mid-batch, to show "Creating 3 of 6..." instead of a single
  // opaque spinner for what can be a several-second loop of N create+
  // upload round trips.
  const [batchProgress, setBatchProgress] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  const isBatchMode =
    mode === "upload" && uploadMode === "batch" && selectedFiles.length > 1;

  // Workspace-wide, not cluster-scoped - a generated test can draw its
  // shape from a source test in any cluster, not just this one. Only
  // fetched once the user actually opens the "Generate" panel, since most
  // modal opens never need this list at all.
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

  // Shared by the file <input>'s onChange in CreateMockTestUploadPanel -
  // pulled up here (rather than left inline in that component) purely so
  // the name-autofill side effect below reads/writes form state the same
  // patch-through-updateForm way every other field does.
  const handleFilesPicked = (picked) => {
    if (picked.length === 0) return;
    setSelectedFiles((current) => [...current, ...picked]);
    // Only auto-fill the name from a single file's name, the same as
    // before - with several files there's no one obvious name to guess,
    // and batch mode below derives each created test's name from its own
    // file anyway.
    if (
      selectedFiles.length === 0 &&
      picked.length === 1 &&
      !form.name.trim()
    ) {
      updateForm({ name: picked[0].name.replace(/\.[^.]+$/, "") });
    }
  };

  const removeFile = (index) =>
    setSelectedFiles((current) => current.filter((_, i) => i !== index));

  const stepValidationError = (step) => {
    if (step === 1) {
      if (mode === "upload" && selectedFiles.length === 0) {
        return "Choose at least one file to upload, or switch to Generate New/Start Blank.";
      }
      if (mode === "generate" && selectedSourceIds.length === 0) {
        return "Select at least one source mock test to generate from.";
      }
      return "";
    }
    if (step === 2 && !isBatchMode && !form.name.trim()) {
      return "Give this mock test a name.";
    }
    return "";
  };

  const goToNextStep = () => {
    const validationError = stepValidationError(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setCurrentStep((step) =>
      Math.min(step + 1, CREATE_MOCK_TEST_STEPS.length),
    );
  };

  const goToPreviousStep = () => {
    setError("");
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (mode === "generate" && selectedSourceIds.length === 0) {
      setError("Select at least one source mock test to generate from");
      return;
    }

    setIsSubmitting(true);

    // Shared by both branches below - the settings every created mock
    // test (one, in combine/generate/blank mode, or several in batch
    // mode) gets, only the name itself differs per branch.
    const buildCreatePayload = (name) => ({
      name,
      description: form.description,
      durationMinutes: Number(form.durationMinutes),
      marksPerCorrect: Number(form.marksPerCorrect),
      negativeMarksPerWrong: Number(form.negativeMarksPerWrong),
      settings: {
        showMarksToStudents: Boolean(form.showMarksToStudents),
        questionOrder: form.questionOrder,
      },
    });

    try {
      if (isBatchMode) {
        const prefix = form.name.trim();
        const created = [];
        const failures = [];
        setBatchProgress({ done: 0, total: selectedFiles.length });

        // Sequential, not Promise.all - these are real create+upload API
        // calls per file, and a batch of many files hammering the backend
        // concurrently isn't worth the speedup for what's normally a
        // handful of files at a time. Errors are per-file: one bad file
        // (a corrupt image, a failed upload) doesn't lose the mock tests
        // already successfully created for the files before it.
        for (const file of selectedFiles) {
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const testName = prefix ? `${prefix} - ${baseName}` : baseName;
          try {
            const pdfFile = await ensureSingleFileIsPdf(file);
            const result = await api.createMockTest(
              clusterId,
              buildCreatePayload(testName),
            );
            await api.uploadMockTestDocument(
              result.mockTest.id,
              pdfFile,
              documentType,
              parseDesiredQuestionCount(documentType, desiredQuestionCount),
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

        await queryClient.invalidateQueries({
          queryKey: ["mock-tests", clusterId],
        });
        await queryClient.invalidateQueries({ queryKey: ["clusters"] });
        await queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"],
        });

        if (created.length === 0) {
          setError(
            `Could not create any mock tests: ` +
              failures.map((f) => `${f.fileName} (${f.message})`).join("; "),
          );
          return;
        }

        if (failures.length > 0) {
          // Some tests were created despite the failures - don't hide
          // that by staying on the (now half-wrong) form; navigate away
          // like the success path, but keep the failure detail visible
          // via a toast-style message would be nicer, but this form has
          // no toast plumbing, so surface it the same way any other
          // partial failure here does and let the cluster view show what
          // actually landed.
          window.alert(
            `Created ${created.length} of ${selectedFiles.length} mock tests.\n\nFailed:\n` +
              failures.map((f) => `- ${f.fileName}: ${f.message}`).join("\n"),
          );
        }

        onClose();
        navigate(`/cluster/${clusterId}`);
        return;
      }

      const result = await api.createMockTest(
        clusterId,
        buildCreatePayload(form.name),
      );

      if (mode === "upload" && selectedFiles.length > 0) {
        // Single already-PDF or Office-document file: pass through
        // unchanged, no pdf-lib round-trip, exactly today's behavior for
        // a PDF (and analogous for an Office doc - see
        // pdfAssembly.js#ensureSingleFileIsPdf). Anything else (a lone
        // image, or 2+ files being combined) needs assembly first.
        const singleFile =
          selectedFiles.length === 1 ? selectedFiles[0] : null;
        const fileToUpload =
          singleFile && (isPdfFile(singleFile) || isOfficeDocFile(singleFile))
            ? singleFile
            : singleFile
              ? await ensureSingleFileIsPdf(singleFile)
              : await mergeFilesToPdf(selectedFiles);

        await api.uploadMockTestDocument(
          result.mockTest.id,
          fileToUpload,
          documentType,
          parseDesiredQuestionCount(documentType, desiredQuestionCount),
        );
      } else if (mode === "generate") {
        await api.generateMockTestFromExisting(result.mockTest.id, {
          sourceMockTestIds: selectedSourceIds,
          targetQuestionCount: Number(targetQuestionCount),
          difficultyHint,
        });
      }

      const willProcess =
        (mode === "upload" && selectedFiles.length > 0) ||
        mode === "generate";

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
      setError(
        submitError instanceof PdfAssemblyError
          ? submitError.message
          : submitError.message || "Could not create mock test",
      );
    } finally {
      setIsSubmitting(false);
      setBatchProgress(null);
    }
  };

  return {
    uid,
    isViewer,
    form,
    updateForm,
    mode,
    setMode,
    selectedFiles,
    setSelectedFiles,
    handleFilesPicked,
    removeFile,
    uploadMode,
    setUploadMode,
    isBatchMode,
    documentType,
    setDocumentType,
    desiredQuestionCount,
    setDesiredQuestionCount,
    selectedSourceIds,
    toggleSource,
    targetQuestionCount,
    setTargetQuestionCount,
    difficultyHint,
    setDifficultyHint,
    isLoadingSources,
    availableSources,
    error,
    isSubmitting,
    batchProgress,
    currentStep,
    goToNextStep,
    goToPreviousStep,
    handleSubmit,
  };
}
