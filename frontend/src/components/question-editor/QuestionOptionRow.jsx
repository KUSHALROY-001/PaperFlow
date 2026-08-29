import {
  Bold,
  Code2,
  ImagePlus,
  Italic,
  MoreVertical,
  Sparkles,
  Strikethrough,
  Trash2,
  Underline,
} from "lucide-react";
import FormattedTextEditor from "../shared/FormattedTextEditor";
import { DiagramAssetsProvider } from "@/lib/diagramAssetsContext";

const OPTION_TOOLBAR_BUTTONS = [
  { action: "toggleBold", icon: Bold, label: "Bold" },
  { action: "toggleItalic", icon: Italic, label: "Italic" },
  { action: "toggleUnderline", icon: Underline, label: "Underline" },
  { action: "toggleStrike", icon: Strikethrough, label: "Strikethrough" },
];

export default function QuestionOptionRow({
  index,
  option,
  isCorrect,
  totalOptions,
  questionId,
  mockTestId,
  diagramAssets,
  areOptionsRaw,
  isOpenMenu,
  onToggleMenu,
  onSetCorrect,
  onRemove,
  onUpdate,
  onOptionAction,
  optionMenuRefCallback,
  optionEditorRefCallback,
  isViewer,
}) {
  const optionLetter = String.fromCharCode(65 + index);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-0 rounded-2xl sm:rounded-none bg-card/50 sm:bg-transparent border sm:border-0 border-border/60">
      <div className="flex items-center justify-between sm:contents">
        <button
          type="button"
          disabled={isViewer}
          onClick={() => !isViewer && onSetCorrect(index)}
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all font-bold text-xs border-2 ${
            isViewer
              ? "cursor-not-allowed opacity-50 border-border text-muted-foreground"
              : isCorrect
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-border text-muted-foreground hover:border-orange-500/40"
          }`}
        >
          {optionLetter}
        </button>
        <div className="flex items-center gap-1 shrink-0 sm:flex-col-reverse sm:order-last">
          <button
            type="button"
            disabled={isViewer || totalOptions <= 2}
            onClick={() => !isViewer && onRemove(index)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 ${
              isViewer
                ? "cursor-not-allowed text-muted-foreground/30"
                : "hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
            }`}
            title="Delete Option"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div ref={optionMenuRefCallback} className="relative">
            <button
              type="button"
              disabled={isViewer}
              onMouseDown={(event) => event.preventDefault()}
              onClick={onToggleMenu}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isViewer
                  ? "cursor-not-allowed text-muted-foreground/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={`Option ${optionLetter} actions`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isOpenMenu && !isViewer && (
              <div className="absolute right-0 top-9 z-30 w-56 rounded-xl border border-border bg-card p-2 shadow-xl">
                <div className="flex items-center gap-1 border-b border-border pb-2">
                  {OPTION_TOOLBAR_BUTTONS.map(({ action, icon: Icon, label }) => (
                    <button
                      key={action}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onOptionAction(index, action)}
                      title={label}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                  <select
                    defaultValue=""
                    onChange={(event) =>
                      onOptionAction(
                        index,
                        `heading:${event.target.value}`,
                      )
                    }
                    aria-label="Option text style"
                    className="ml-1 h-8 flex-1 rounded-lg border border-border bg-card px-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-orange-500/30"
                  >
                    <option value="">Text</option>
                    <option value="1">Heading 1</option>
                    <option value="2">Heading 2</option>
                    <option value="3">Heading 3</option>
                  </select>
                </div>
                <div className="mt-1 space-y-0.5">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onOptionAction(index, "insertMath")}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted hover:text-orange-500"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                    Insert math
                  </button>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onOptionAction(index, "insertImage")}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted hover:text-orange-500"
                  >
                    <ImagePlus className="h-3.5 w-3.5 text-orange-500" />
                    Insert image
                  </button>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onOptionAction(index, "indentCode")}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted hover:text-orange-500"
                  >
                    <Code2 className="h-3.5 w-3.5 text-orange-500" />
                    Indent code
                  </button>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onOptionAction(index, "cleanMath")}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted hover:text-orange-500"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                    Clean up pasted math
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {areOptionsRaw ? (
        <textarea
          disabled={isViewer}
          value={option || ""}
          onChange={(e) => !isViewer && onUpdate(index, e.target.value)}
          placeholder={`Option ${optionLetter}`}
          rows={1}
          ref={(el) => {
            if (!el) return;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
          className={`w-full sm:flex-1 px-4 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all resize-none overflow-hidden min-h-10 ${
            isViewer
              ? "cursor-not-allowed opacity-60 border-border bg-card text-foreground"
              : isCorrect
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-bold"
                : "border-border bg-card text-foreground"
          }`}
        />
      ) : (
        <div className="w-full sm:flex-1 min-w-0">
          <DiagramAssetsProvider assets={diagramAssets}>
            <FormattedTextEditor
              ref={optionEditorRefCallback}
              value={option || ""}
              onChange={(value) => onUpdate(index, value)}
              disabled={isViewer}
              placeholder={`Option ${optionLetter}`}
              showToolbar={false}
              questionId={questionId}
              mockTestId={mockTestId}
            />
          </DiagramAssetsProvider>
        </div>
      )}
    </div>
  );
}
