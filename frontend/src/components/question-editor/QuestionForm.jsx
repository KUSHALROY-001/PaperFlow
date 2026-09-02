import { Eye } from "lucide-react";
import { useQuestionForm } from "@/hooks/useQuestionForm";
import { usePanelResize } from "@/hooks/usePanelResize";
import DiagramCropModal from "./DiagramCropModal";
import EditorPanelResizer from "./EditorPanelResizer";
import QuestionTextCard from "./QuestionTextCard";
import QuestionExplanationCard from "./QuestionExplanationCard";
import QuestionOptionsCard from "./QuestionOptionsCard";
import QuestionPreviewCard from "./QuestionPreviewCard";

export default function QuestionForm({
  selected,
  mockTestId,
  extractedTopics,
  isCustomTopic,
  setIsCustomTopic,
  updateSelected,
  updateOption,
  setCorrectOption,
  addOption,
  removeOption,
  isViewer,
  paperDefaultMarks = null,
  paperDefaultNegative = null,
}) {
  const {
    isCropModalOpen,
    setIsCropModalOpen,
    diagramError,
    setDiagramError,
    isQuestionRaw,
    setIsQuestionRaw,
    isExplanationRaw,
    setIsExplanationRaw,
    areOptionsRaw,
    setAreOptionsRaw,
    isQuestionMenuOpen,
    setIsQuestionMenuOpen,
    isExplanationMenuOpen,
    setIsExplanationMenuOpen,
    openOptionMenu,
    setOpenOptionMenu,
    questionTextRef,
    explanationRef,
    formattedQuestionRef,
    formattedExplanationRef,
    questionMenuRef,
    explanationMenuRef,
    optionEditorRefs,
    optionMenuRefs,
    handleInsertMath,
    handleInsertImage,
    handleCleanUpMath,
    handleIndentCode,
    handleIndentExplanationCode,
    handleOptionAction,
    handleKeyDownTextarea,
    handleQuestionTypeChange,
  } = useQuestionForm({
    selected,
    isViewer,
    updateSelected,
    updateOption,
  });

  const {
    containerRef,
    leftPercent,
    isDragging,
    isCollapsed,
    handlePointerDown,
    toggleCollapse,
  } = usePanelResize({
    storageKey: "paperflow_question_editor_split",
    defaultPercent: 50,
    minPercent: 30,
    maxPercent: 75,
  });

  return (
    <main className="flex-1 p-2 w-full min-w-0">
      <div
        ref={containerRef}
        className="flex flex-col lg:flex-row gap-3 lg:gap-0 w-full relative lg:items-stretch"
      >
        {/* Left Column: Question Editor Controls */}
        <div
          className="w-full space-y-6 min-w-0 shrink-0 transition-[flex-basis] duration-75 ease-out"
          style={{
            flexBasis: isCollapsed ? "100%" : `calc(${leftPercent}% - 0.5rem)`,
            flexGrow: isCollapsed ? 1 : 0,
          }}
        >
          <QuestionTextCard
            topic={selected.topic}
            extractedTopics={extractedTopics}
            isCustomTopic={isCustomTopic}
            setIsCustomTopic={setIsCustomTopic}
            text={selected.text}
            questionId={selected.id}
            mockTestId={mockTestId}
            diagramAssets={selected.diagramAssets}
            updateSelected={updateSelected}
            isQuestionRaw={isQuestionRaw}
            setIsQuestionRaw={setIsQuestionRaw}
            isQuestionMenuOpen={isQuestionMenuOpen}
            setIsQuestionMenuOpen={setIsQuestionMenuOpen}
            questionMenuRef={questionMenuRef}
            questionTextRef={questionTextRef}
            formattedQuestionRef={formattedQuestionRef}
            handleInsertMath={handleInsertMath}
            handleInsertImage={handleInsertImage}
            handleIndentCode={handleIndentCode}
            handleCleanUpMath={handleCleanUpMath}
            handleKeyDownTextarea={handleKeyDownTextarea}
            isViewer={isViewer}
            marksPerCorrect={selected.marksPerCorrect}
            negativeMarksPerWrong={selected.negativeMarksPerWrong}
            paperDefaultMarks={paperDefaultMarks}
            paperDefaultNegative={paperDefaultNegative}
          />

          <QuestionExplanationCard
            explanation={selected.explanation}
            questionId={selected.id}
            mockTestId={mockTestId}
            diagramAssets={selected.diagramAssets}
            updateSelected={updateSelected}
            isExplanationRaw={isExplanationRaw}
            setIsExplanationRaw={setIsExplanationRaw}
            isExplanationMenuOpen={isExplanationMenuOpen}
            setIsExplanationMenuOpen={setIsExplanationMenuOpen}
            explanationMenuRef={explanationMenuRef}
            explanationRef={explanationRef}
            formattedExplanationRef={formattedExplanationRef}
            handleInsertMath={handleInsertMath}
            handleInsertImage={handleInsertImage}
            handleIndentExplanationCode={handleIndentExplanationCode}
            handleKeyDownTextarea={handleKeyDownTextarea}
            isViewer={isViewer}
          />

          <QuestionOptionsCard
            options={selected.options}
            correctOptionIndexes={selected.correctOptionIndexes}
            questionType={selected.questionType}
            questionId={selected.id}
            mockTestId={mockTestId}
            diagramAssets={selected.diagramAssets}
            areOptionsRaw={areOptionsRaw}
            setAreOptionsRaw={setAreOptionsRaw}
            handleQuestionTypeChange={handleQuestionTypeChange}
            setCorrectOption={setCorrectOption}
            removeOption={removeOption}
            addOption={addOption}
            updateOption={updateOption}
            handleOptionAction={handleOptionAction}
            openOptionMenu={openOptionMenu}
            setOpenOptionMenu={setOpenOptionMenu}
            optionMenuRefs={optionMenuRefs}
            optionEditorRefs={optionEditorRefs}
            isViewer={isViewer}
          />
        </div>

        {/* Vertical Resizer / Dragger */}
        <EditorPanelResizer
          isDragging={isDragging}
          isCollapsed={isCollapsed}
          onPointerDown={handlePointerDown}
          onToggleCollapse={toggleCollapse}
        />

        {/* Right Column: Live Preview & Diagram Settings */}
        {!isCollapsed ? (
          <div
            className="w-full min-w-0 shrink-0 transition-[flex-basis] duration-75 ease-out"
            style={{
              flexBasis: `calc(${100 - leftPercent}% - 0.5rem)`,
              flexGrow: 1,
            }}
          >
            {/*
              Stretch this column to the left column's height (lg:items-stretch
              on the parent), then stick the preview inside it. Without a tall
              containing block, sticky had nothing to stick within — both
              columns scrolled away together.
            */}
            <div className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-1.5rem)] lg:overflow-y-auto lg:overscroll-contain">
              <QuestionPreviewCard
                selected={selected}
                mockTestId={mockTestId}
                diagramError={diagramError}
                setDiagramError={setDiagramError}
                onOpenCropModal={() => setIsCropModalOpen(true)}
                updateSelected={updateSelected}
                isViewer={isViewer}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex fixed right-4 bottom-6 z-30 items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg hover:shadow-xl transition-all shadow-orange-500/25 animate-in fade-in"
            title="Expand live preview"
          >
            <Eye className="w-4 h-4" /> Live Preview
          </button>
        )}
      </div>

      {isCropModalOpen && (
        <DiagramCropModal
          key={selected.id}
          questionId={selected.id}
          mockTestId={mockTestId}
          diagramUrl={selected.diagramUrl}
          onClose={() => setIsCropModalOpen(false)}
        />
      )}
    </main>
  );
}
