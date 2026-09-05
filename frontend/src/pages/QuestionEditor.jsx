import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuestionEditor } from "@/hooks/useQuestionEditor";
import { useAuth } from "@/lib/AuthContext";
import EditorSidebar from "../components/question-editor/EditorSidebar";
import EditorHeader from "../components/question-editor/EditorHeader";
import EmptyEditorView from "../components/question-editor/EmptyEditorView";
import QuestionForm from "../components/question-editor/QuestionForm";
import LatexReferenceModal from "../components/question-editor/LatexReferenceModal";
import FloatingDragGhost from "../components/question-editor/FloatingDragGhost";
import { ConfirmDialog } from "../components/design-system/ConfirmDialog";

export default function QuestionEditor() {
  const navigate = useNavigate();
  const { isViewer } = useAuth();
  const [searchParams] = useSearchParams();
  // Set when arriving here from the Review Queue's Edit action (see
  // QueueQuestionCard.jsx) - only that flow ever sets it, so its mere
  // presence is enough to show the breadcrumb without a dedicated
  // "cameFromReviewQueue" boolean param.
  const returnTo = searchParams.get("returnTo");
  const [pendingLeavePath, setPendingLeavePath] = useState(null);
  const [isLatexReferenceOpen, setIsLatexReferenceOpen] = useState(false);

  const {
    clusterId,
    mockTestId,
    questions,
    selected,
    selectedId,
    setSelectedId,
    saved,
    error,
    isSaving,
    isLoading,
    issuesById,
    issueCount,
    extractedTopics,
    hasUnsavedChanges,
    selectedIsDirty,
    dirtyContentCount,
    orderChangeCount,
    updateSelected,
    updateOption,
    setCorrectOption,
    addOption,
    removeOption,
    addQuestion,
    deleteQuestion,
    reorderQuestions,
    handleSave,
    paperDefaultMarks,
    paperDefaultNegative,
  } = useQuestionEditor();

  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const sidebarRef = useRef(null);

  // Mouse press drag state & cursor position for floating ghost preview
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      if (sidebarRef.current) {
        const container = sidebarRef.current;
        const rect = container.getBoundingClientRect();
        const threshold = 60;
        if (e.clientY - rect.top < threshold) {
          container.scrollTop -= 12;
        } else if (rect.bottom - e.clientY < threshold) {
          container.scrollTop += 12;
        }
      }
    };

    const handleWheel = (e) => {
      if (sidebarRef.current) {
        sidebarRef.current.scrollTop += e.deltaY;
      }
    };

    const handleMouseUp = () => {
      if (
        draggingIndex !== null &&
        dragOverIndex !== null &&
        draggingIndex !== dragOverIndex
      ) {
        reorderQuestions(draggingIndex, dragOverIndex);
      }
      setDraggingIndex(null);
      setDragOverIndex(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingIndex, dragOverIndex, reorderQuestions]);

  // Intercept browser back button / popstate gesture when unsaved changes exist
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    window.history.pushState({ editorGuard: true }, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState({ editorGuard: true }, "", window.location.href);
      const target = mockTestId
        ? `/cluster/${clusterId}/mocktest/${mockTestId}`
        : `/cluster/${clusterId}`;
      setPendingLeavePath(target);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges, clusterId, mockTestId]);

  const handleCardMouseDown = (e, index) => {
    if (isViewer) return;
    setDraggingIndex(index);
    setDragOverIndex(index);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleCardMouseEnter = (index) => {
    if (!isViewer && draggingIndex !== null) {
      setDragOverIndex(index);
    }
  };

  if (!mockTestId) {
    return (
      <div className="surface-card rounded-2xl p-8 border border-border">
        <p className="font-bold text-foreground">Select a mock test first.</p>
        <Link
          to={`/cluster/${clusterId}`}
          className="mt-4 inline-flex rounded-xl bg-[#ea580c] hover:bg-[#c2410c] px-4 py-2 text-sm font-bold text-white shadow-xs"
        >
          Back to Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-inter">
      <EditorSidebar
        clusterId={clusterId}
        mockTestId={mockTestId}
        questions={questions}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        deleteQuestion={deleteQuestion}
        issuesById={issuesById}
        isLoading={isLoading}
        sidebarRef={sidebarRef}
        onCardMouseDown={handleCardMouseDown}
        onCardMouseEnter={handleCardMouseEnter}
        draggingIndex={draggingIndex}
        dragOverIndex={dragOverIndex}
        addQuestion={addQuestion}
        isViewer={isViewer}
        hasUnsavedChanges={hasUnsavedChanges}
        onRequestLeave={(path) => setPendingLeavePath(path)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <EditorHeader
          questionsCount={questions.length}
          issueCount={issueCount}
          addQuestion={addQuestion}
          handleSave={handleSave}
          isSaving={isSaving}
          saved={saved}
          isViewer={isViewer}
          onShowLatexReference={() => setIsLatexReferenceOpen(true)}
          returnTo={returnTo}
          selectedIsDirty={selectedIsDirty}
          hasUnsavedChanges={hasUnsavedChanges}
          dirtyContentCount={dirtyContentCount}
          orderChangeCount={orderChangeCount}
        />

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500 sm:mx-6 lg:mx-8">
            {error}
          </div>
        )}

        {!selected && !isLoading && (
          <EmptyEditorView addQuestion={addQuestion} isViewer={isViewer} />
        )}
        {selected && (
          <QuestionForm
            selected={selected}
            mockTestId={mockTestId}
            paperDefaultMarks={paperDefaultMarks}
            paperDefaultNegative={paperDefaultNegative}
            extractedTopics={extractedTopics}
            isCustomTopic={isCustomTopic}
            setIsCustomTopic={setIsCustomTopic}
            updateSelected={updateSelected}
            updateOption={updateOption}
            setCorrectOption={setCorrectOption}
            addOption={addOption}
            removeOption={removeOption}
            isViewer={isViewer}
          />
        )}
      </div>

      <FloatingDragGhost
        draggingQuestion={
          draggingIndex !== null ? questions[draggingIndex] : null
        }
        mousePos={mousePos}
      />

      {isLatexReferenceOpen && (
        <LatexReferenceModal onClose={() => setIsLatexReferenceOpen(false)} />
      )}

      {pendingLeavePath && (
        <ConfirmDialog
          open={Boolean(pendingLeavePath)}
          onOpenChange={(open) => !open && setPendingLeavePath(null)}
          title="Unsaved Changes Caution"
          description="You have unsaved changes in this question editor. If you leave, your unsaved edits will be lost."
          warning={true}
          confirmLabel="Discard & Leave"
          cancelLabel="Stay & Edit"
          onConfirm={() => {
            const target = pendingLeavePath;
            setPendingLeavePath(null);
            navigate(target);
          }}
        />
      )}
    </div>
  );
}
