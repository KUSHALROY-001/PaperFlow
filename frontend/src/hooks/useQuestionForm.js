import { useEffect, useRef, useState } from "react";
import { wrapBareLatex } from "@/utils/questionEditorHelpers";
import { autoIndentMarkdown } from "@/utils/codeIndenter";
import {
  applyRawMathWrap,
  handleTextareaKeyboardShortcuts,
} from "@/utils/editorTextHelpers";

export function useQuestionForm({
  selected,
  isViewer,
  updateSelected,
  updateOption,
}) {
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [diagramError, setDiagramError] = useState("");
  const [isQuestionRaw, setIsQuestionRaw] = useState(false);
  const [isExplanationRaw, setIsExplanationRaw] = useState(false);
  const [areOptionsRaw, setAreOptionsRaw] = useState(false);
  const [isQuestionMenuOpen, setIsQuestionMenuOpen] = useState(false);
  const [isExplanationMenuOpen, setIsExplanationMenuOpen] = useState(false);
  const [openOptionMenu, setOpenOptionMenu] = useState(null);

  const questionTextRef = useRef(null);
  const explanationRef = useRef(null);
  const formattedQuestionRef = useRef(null);
  const formattedExplanationRef = useRef(null);
  const questionMenuRef = useRef(null);
  const explanationMenuRef = useRef(null);
  const optionEditorRefs = useRef({});
  const optionMenuRefs = useRef({});

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        questionMenuRef.current &&
        !questionMenuRef.current.contains(event.target)
      ) {
        setIsQuestionMenuOpen(false);
      }
      if (
        explanationMenuRef.current &&
        !explanationMenuRef.current.contains(event.target)
      ) {
        setIsExplanationMenuOpen(false);
      }
      if (
        !Object.values(optionMenuRefs.current).some((menu) =>
          menu?.contains(event.target),
        )
      ) {
        setOpenOptionMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInsertMath = (field) => {
    const isQuestion = field === "text";
    const isRaw = isQuestion ? isQuestionRaw : isExplanationRaw;
    if (!isRaw) {
      const editorRef = isQuestion
        ? formattedQuestionRef
        : formattedExplanationRef;
      editorRef.current?.insertMath();
    } else {
      const textareaRef = isQuestion ? questionTextRef : explanationRef;
      const textarea = textareaRef.current;
      if (!textarea) return;
      const result = applyRawMathWrap(textarea);
      if (result) {
        updateSelected(field, result.nextValue);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(
            result.selectionStart,
            result.selectionEnd,
          );
        });
      }
    }
  };

  // No raw-mode branch, unlike handleInsertMath above - typing
  // ![[img:slot-key]] by hand into raw markdown is possible, but the
  // actual upload still has to go through the API (there's no client-only
  // equivalent for supplying image bytes the way "$" delimiters are just
  // plain characters), so there's no meaningful raw-mode action to wire
  // up here. Rich mode only, same as MathNode's own math-field editing
  // has no raw-textarea equivalent for the LIVE preview KaTeX gives
  // either - both features are specifically what switching OUT of raw
  // mode buys you.
  const handleInsertImage = (field) => {
    const isQuestion = field === "text";
    const isRaw = isQuestion ? isQuestionRaw : isExplanationRaw;
    if (isRaw) return;
    const editorRef = isQuestion ? formattedQuestionRef : formattedExplanationRef;
    editorRef.current?.insertImage();
  };

  const handleCleanUpMath = () => {
    updateSelected("text", wrapBareLatex(selected?.text || ""));
    updateSelected(
      "options",
      (selected?.options || []).map((option) => wrapBareLatex(option)),
    );
  };

  const handleIndentCode = () => {
    const current = selected?.text || "";
    if (!current.trim()) {
      const template =
        "```c\n#include <stdio.h>\n\nint main() {\n    return 0;\n}\n```";
      updateSelected("text", template);
      return;
    }
    const indented = autoIndentMarkdown(current);
    updateSelected("text", indented);
  };

  const handleIndentExplanationCode = () => {
    const current = selected?.explanation || "";
    if (!current.trim()) return;
    const indented = autoIndentMarkdown(current);
    updateSelected("explanation", indented);
  };

  const handleOptionAction = (index, action) => {
    if (isViewer) return;
    const editor = optionEditorRefs.current[index];

    if (action === "insertMath") {
      editor?.insertMath();
    } else if (action === "insertImage") {
      editor?.insertImage();
    } else if (action === "indentCode") {
      updateOption(index, autoIndentMarkdown(selected?.options?.[index] || ""));
    } else if (action === "cleanMath") {
      updateOption(index, wrapBareLatex(selected?.options?.[index] || ""));
    } else if (action.startsWith("heading:")) {
      editor?.setTextStyle(Number(action.slice("heading:".length)) || null);
    } else {
      editor?.[action]?.();
    }

    if (!action.startsWith("toggle")) setOpenOptionMenu(null);
  };

  const handleKeyDownTextarea = (e, field) => {
    if (isViewer) return;
    handleTextareaKeyboardShortcuts(e, (nextVal) =>
      updateSelected(field, nextVal),
    );
  };

  const handleQuestionTypeChange = (nextType) => {
    if (isViewer) return;
    updateSelected("questionType", nextType);
    if (nextType === "single") {
      updateSelected("correctOptionIndexes", [
        selected?.correctOptionIndexes?.[0] || 0,
      ]);
    }
  };

  return {
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
  };
}
