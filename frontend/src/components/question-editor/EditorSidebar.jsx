import { useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import QuestionCard from "./QuestionCard";
import { ConfirmDialog } from "../design-system/ConfirmDialog";

export default function EditorSidebar({
  clusterId,
  mockTestId,
  questions,
  selectedId,
  setSelectedId,
  deleteQuestion,
  issuesById,
  isLoading,
  sidebarRef,
  onCardMouseDown,
  onCardMouseEnter,
  draggingIndex,
  dragOverIndex,
  addQuestion,
  isViewer,
  hasUnsavedChanges,
  onRequestLeave,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const backPath = mockTestId
    ? `/cluster/${clusterId}/mocktest/${mockTestId}`
    : `/cluster/${clusterId}`;

  const handleBackClick = (e) => {
    if (hasUnsavedChanges && onRequestLeave) {
      e.preventDefault();
      onRequestLeave(backPath);
    }
  };

  return (
    <aside className="w-full lg:w-72 bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col shrink-0 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] z-10 font-inter">
      <div className="p-4 border-b border-border">
        <Link
          to={backPath}
          onClick={handleBackClick}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-orange-500 mb-3 transition-colors font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Mock Test
        </Link>
        <h2 className="text-base font-extrabold text-foreground tracking-tight">
          Question Editor
        </h2>
        <p className="text-xs text-muted-foreground">
          {isViewer
            ? "Read-only mode (Viewer role)"
            : "Click & hold cards to swap • Scroll freely"}
        </p>
      </div>

      <div
        ref={sidebarRef}
        className="max-h-72 lg:max-h-none lg:flex-1 overflow-y-auto scrollbar-hidden p-4 space-y-2"
      >
        {isLoading && (
          <div className="text-sm text-muted-foreground">
            Loading questions...
          </div>
        )}
        {questions.map((q, index) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={index}
            isSelected={q.id === selectedId}
            onSelect={setSelectedId}
            onDelete={() => setDeleteTarget(q)}
            issues={issuesById.get(q.id)}
            onCardMouseDown={onCardMouseDown}
            onCardMouseEnter={onCardMouseEnter}
            isDragging={draggingIndex === index}
            isDragOver={dragOverIndex === index}
          />
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => !isViewer && addQuestion()}
          disabled={isViewer}
          title={
            isViewer ? "Editor role is required to add questions" : undefined
          }
          className={`w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-xl transition-all text-xs sm:text-sm font-bold ${
            isViewer
              ? "border-border text-muted-foreground/40 cursor-not-allowed opacity-50"
              : "border-orange-500/40 text-orange-500 hover:bg-orange-500/10"
          }`}
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={`Delete Q${deleteTarget.questionNo}?`}
          description="Are you sure you want to delete this question? This action cannot be undone."
          confirmLabel="Delete Question"
          destructive={true}
          onConfirm={() => {
            deleteQuestion(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </aside>
  );
}
