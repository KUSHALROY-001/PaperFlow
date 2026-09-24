import { FileText, Sparkles, FilePlus } from "lucide-react";

export default function CreateMockTestModeSelector({ mode, setMode }) {
  return (
    <div data-tour="mock-mode">
      <p className="mb-2 block text-sm font-semibold text-foreground">
        How should this test get its questions?
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex flex-col items-center gap-1.5 rounded-md border-2 px-2 py-3 text-center transition-all ${
            mode === "upload"
              ? "border-orange-500/60 bg-orange-500/10"
              : "border-border bg-muted/40 hover:border-orange-500/30"
          }`}
        >
          <FileText className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-semibold text-foreground">
            Upload File
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("generate")}
          className={`flex flex-col items-center gap-1.5 rounded-md border-2 px-2 py-3 text-center transition-all ${
            mode === "generate"
              ? "border-orange-500/60 bg-orange-500/10"
              : "border-border bg-muted/40 hover:border-orange-500/30"
          }`}
        >
          <Sparkles className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-semibold text-foreground">
            Generate New
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("blank")}
          className={`flex flex-col items-center gap-1.5 rounded-md border-2 px-2 py-3 text-center transition-all ${
            mode === "blank"
              ? "border-orange-500/60 bg-orange-500/10"
              : "border-border bg-muted/40 hover:border-orange-500/30"
          }`}
        >
          <FilePlus className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-semibold text-foreground">
            Start Blank
          </span>
        </button>
      </div>
    </div>
  );
}
