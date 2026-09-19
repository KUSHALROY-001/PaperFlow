import {
  ChevronUp,
  ChevronDown,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { isPdfFile } from "@/lib/pdfAssembly";

// Reorderable list of picked files, shared by UploadPdfPanel (always
// "combine" mode) and CreateMockTestModal (combine OR batch mode). Up/
// down buttons rather than full drag-and-drop reordering - order only
// needs to be *settable*, not dragged, and this avoids pulling in a DnD
// library for what's a short list in practice (a handful of pages/files
// per upload).
export default function MultiFileList({ files, onReorder, onRemove }) {
  if (!files || files.length === 0) return null;

  const moveFile = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    const next = [...files];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onReorder(next);
  };

  return (
    <ul className="mt-2 space-y-1.5">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${file.lastModified}-${index}`}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs"
        >
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {index + 1}.
          </span>
          {isPdfFile(file) ? (
            <FileText className="h-3.5 w-3.5 shrink-0 text-orange-500" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5 shrink-0 text-orange-500" />
          )}
          <span className="min-w-0 flex-1 truncate text-foreground">
            {file.name}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => moveFile(index, -1)}
              disabled={index === 0}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              aria-label={`Move ${file.name} up`}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moveFile(index, 1)}
              disabled={index === files.length - 1}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              aria-label={`Move ${file.name} down`}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded p-1 text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
