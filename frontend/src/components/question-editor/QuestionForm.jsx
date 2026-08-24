import { useQuestionForm } from "@/hooks/useQuestionForm";
import DiagramCropModal from "./DiagramCropModal";
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

  return (
    <main className="flex-1 p-2 w-full min-w-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
        {/* Left Column: Question Editor Controls */}
        <div className="space-y-6">
          <QuestionTextCard
            topic={selected.topic}
            extractedTopics={extractedTopics}
            isCustomTopic={isCustomTopic}
            setIsCustomTopic={setIsCustomTopic}
            text={selected.text}
            updateSelected={updateSelected}
            isQuestionRaw={isQuestionRaw}
            setIsQuestionRaw={setIsQuestionRaw}
            isQuestionMenuOpen={isQuestionMenuOpen}
            setIsQuestionMenuOpen={setIsQuestionMenuOpen}
            questionMenuRef={questionMenuRef}
            questionTextRef={questionTextRef}
            formattedQuestionRef={formattedQuestionRef}
            handleInsertMath={handleInsertMath}
            handleIndentCode={handleIndentCode}
            handleCleanUpMath={handleCleanUpMath}
            handleKeyDownTextarea={handleKeyDownTextarea}
            isViewer={isViewer}
          />

          <QuestionExplanationCard
            explanation={selected.explanation}
            updateSelected={updateSelected}
            isExplanationRaw={isExplanationRaw}
            setIsExplanationRaw={setIsExplanationRaw}
            isExplanationMenuOpen={isExplanationMenuOpen}
            setIsExplanationMenuOpen={setIsExplanationMenuOpen}
            explanationMenuRef={explanationMenuRef}
            explanationRef={explanationRef}
            formattedExplanationRef={formattedExplanationRef}
            handleInsertMath={handleInsertMath}
            handleIndentExplanationCode={handleIndentExplanationCode}
            handleKeyDownTextarea={handleKeyDownTextarea}
            isViewer={isViewer}
          />

          <QuestionOptionsCard
            options={selected.options}
            correctOptionIndexes={selected.correctOptionIndexes}
            questionType={selected.questionType}
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

        {/* Right Column: Live Preview & Diagram Settings */}
        <QuestionPreviewCard
          selected={selected}
          mockTestId={mockTestId}
          diagramError={diagramError}
          setDiagramError={setDiagramError}
          onOpenCropModal={() => setIsCropModalOpen(true)}
          isViewer={isViewer}
        />
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
