import { useState } from "react";
import {
  ChevronLeft,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
} from "lucide-react";
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <aside
      className={`bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col shrink-0 lg:sticky lg:top-0 lg:h-screen z-10 font-inter transition-all duration-200 w-full ${
        isCollapsed ? "lg:w-18" : "lg:w-72"
      }`}
    >
      {/* Header section */}
      <div className="p-3 sm:p-4 border-b border-border">
        {/* Desktop Collapsed View Header */}
        {isCollapsed && (
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-2.5">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-9 h-9 rounded-full border border-border bg-card hover:bg-orange-500/10 hover:border-orange-500/40 text-muted-foreground hover:text-orange-500 flex items-center justify-center transition-all"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <Link
              to={backPath}
              onClick={handleBackClick}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-orange-500 hover:bg-muted transition-colors"
              title="Back to Mock Test"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Normal Header (Always shown on Mobile, and Desktop when expanded) */}
        <div className={isCollapsed ? "block lg:hidden" : "block"}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <Link
              to={backPath}
              onClick={handleBackClick}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-orange-500 transition-colors font-medium min-w-0 truncate"
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Back to Mock Test</span>
            </Link>
            {/* Collapse toggle button - HIDDEN on mobile (hidden lg:flex) */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex w-7 h-7 rounded-full border border-border bg-card hover:bg-orange-500/10 hover:border-orange-500/40 text-muted-foreground hover:text-orange-500 items-center justify-center transition-all shrink-0"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
          <h2 className="text-base font-extrabold text-foreground tracking-tight">
            Question Editor
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            {isViewer
              ? "Read-only mode (Viewer role)"
              : "Click & hold cards to swap • Scroll freely"}
          </p>
        </div>
      </div>

      {/* Questions list */}
      <div
        ref={sidebarRef}
        className="max-h-72 lg:max-h-none lg:flex-1 overflow-y-auto scrollbar-hidden p-3"
      >
        {isLoading && (
          <div className="text-xs text-muted-foreground text-center py-2">
            Loading questions...
          </div>
        )}

        {/* Collapsed Circle Badges (Desktop Only) */}
        {isCollapsed && (
          <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-2.5">
            {questions.map((q) => {
              const isSelected = q.id === selectedId;
              const issues = issuesById.get(q.id);
              return (
                <div key={q.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => setSelectedId(q.id)}
                    title={`Q${q.questionNo}: ${q.text || "Untitled question"}`}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-500/40 border-orange-500"
                        : "bg-card text-foreground border border-border hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-500"
                    }`}
                  >
                    Q{q.questionNo}
                  </button>
                  {issues > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-card"
                      title={`${issues} issue(s)`}
                    />
                  )}
                  {!q.persisted && (!issues || issues <= 0) && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-card"
                      title="Draft"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Full QuestionCards (Mobile Always + Desktop Expanded) */}
        <div
          className={`space-y-2 ${isCollapsed ? "block lg:hidden" : "block"}`}
        >
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
      </div>

      {/* Footer / Add Question Button */}
      <div className="p-3 border-t border-border">
        {/* Desktop Collapsed Add Button */}
        {isCollapsed && (
          <div className="hidden lg:flex lg:justify-center">
            <button
              onClick={() => !isViewer && addQuestion()}
              disabled={isViewer}
              title={
                isViewer
                  ? "Editor role is required to add questions"
                  : "Add Question"
              }
              className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${
                isViewer
                  ? "border-border text-muted-foreground/40 cursor-not-allowed opacity-50"
                  : "border-orange-500/40 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500"
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Full Add Button (Mobile Always + Desktop Expanded) */}
        <div className={isCollapsed ? "block lg:hidden" : "block"}>
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
