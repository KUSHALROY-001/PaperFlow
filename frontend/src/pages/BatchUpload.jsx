import { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  Clock,
  Zap,
  AlertCircle,
  Play,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const templates = [
  "GATE CS",
  "JECA Entrance",
  "JEE Mains",
  "Custom (Auto-detect)",
];

function getStatusColor(status) {
  if (status === "queued") return "bg-muted text-muted-foreground border border-border";
  if (status === "processing") return "bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold";
  if (status === "done") return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold";
  if (status === "error") return "bg-red-500/10 text-red-500 border border-red-500/20 font-bold";
  return "bg-muted text-muted-foreground border border-border";
}

function getStatusIcon(status) {
  if (status === "queued") return <Clock className="w-3.5 h-3.5" />;
  if (status === "processing")
    return <Zap className="w-3.5 h-3.5 animate-pulse text-orange-500" />;
  if (status === "done") return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
  if (status === "error") return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
}

export default function BatchUpload() {
  const { isViewer } = useAuth();
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [template, setTemplate] = useState("Custom (Auto-detect)");
  const [started, setStarted] = useState(false);

  const addFiles = useCallback((newFiles) => {
    if (isViewer) return;
    const pdfs = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf",
    );
    const entries = pdfs.map((f) => ({
      id: Date.now() + Math.random(),
      file: f,
      name: f.name,
      size: f.size,
      status: "queued",
      progress: 0,
      mockTestName: f.name.replace(".pdf", ""),
    }));
    setFiles((prev) => [...prev, ...entries]);
  }, [isViewer]);

  const handleDrop = (e) => {
    e.preventDefault();
    if (isViewer) return;
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (id) =>
    !isViewer && setFiles((prev) => prev.filter((f) => f.id !== id));

  const updateName = (id, name) =>
    !isViewer &&
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, mockTestName: name } : f)),
    );

  const handleStart = () => {
    if (isViewer) return;
    setStarted(true);
    files.forEach((file, i) => {
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "processing", progress: 0 } : f,
          ),
        );
        const interval = setInterval(() => {
          setFiles((prev) => {
            const updated = prev.map((f) => {
              if (f.id !== file.id) return f;
              const newProgress = Math.min(
                f.progress + Math.random() * 25,
                100,
              );
              if (newProgress >= 100) {
                clearInterval(interval);
                return { ...f, progress: 100, status: "done" };
              }
              return { ...f, progress: Math.round(newProgress) };
            });
            return updated;
          });
        }, 600);
      }, i * 1200);
    });
  };

  const allDone = files.length > 0 && files.every((f) => f.status === "done");

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Batch Upload</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Upload multiple PDFs at once and queue them as mock tests inside a
          selected cluster.
        </p>
      </div>

      {/* Drop zone */}
      {!started && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isViewer) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => !isViewer && document.getElementById("batch-upload").click()}
          title={isViewer ? "Editor role is required to upload files" : undefined}
          className={`border-2 border-dashed rounded-3xl p-6 sm:p-12 text-center transition-all ${
            isViewer
              ? "border-border bg-muted/40 cursor-not-allowed opacity-50"
              : dragging
                ? "border-orange-500 bg-orange-500/10 cursor-pointer"
                : "border-border hover:border-orange-500/40 hover:bg-muted/40 cursor-pointer"
          }`}
        >
          <div className="w-16 h-16 bg-orange-500/15 rounded-2xl flex items-center justify-center text-orange-500 mx-auto mb-4">
            <Upload className="w-8 h-8" />
          </div>
          <p className="text-lg font-bold text-foreground mb-1">
            {isViewer ? "Batch Upload Disabled for Viewers" : "Drop your PDFs here"}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
            {isViewer ? "Editor role is required to upload documents" : "or click to browse · PDF only · max 50MB each · no limit on count"}
          </p>
          {!isViewer && (
            <p className="text-xs font-semibold text-orange-500">
              Each PDF will become its own mock test
            </p>
          )}
          <input
            id="batch-upload"
            type="file"
            accept=".pdf"
            multiple
            disabled={isViewer}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-bold text-foreground">
              {files.length} File{files.length > 1 ? "s" : ""} Queued
            </h2>
            {!started && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  disabled={isViewer}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className={`px-3 py-2 text-xs sm:text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
                    isViewer ? "cursor-not-allowed opacity-50" : ""
                  }`}
                >
                  {templates.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button
                  disabled={isViewer || files.length === 0}
                  onClick={handleStart}
                  title={isViewer ? "Editor role is required to process files" : undefined}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 font-semibold rounded-xl shadow-xs transition-all text-xs sm:text-sm ${
                    isViewer
                      ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50"
                      : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
                  }`}
                >
                  <Play className="w-4 h-4" /> Start Processing
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {files.map((f) => (
              <div
                key={f.id}
                className={`surface-card rounded-2xl p-4 border transition-all ${f.status === "done" ? "border-emerald-500/30" : f.status === "error" ? "border-red-500/30" : "border-border"}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${f.status === "done" ? "bg-emerald-500/15 text-emerald-500" : f.status === "processing" ? "bg-orange-500/15 text-orange-500" : "bg-muted text-muted-foreground"}`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {!started ? (
                      <input
                        disabled={isViewer}
                        value={f.mockTestName}
                        onChange={(e) => updateName(f.id, e.target.value)}
                        className={`w-full text-xs sm:text-sm font-bold text-foreground bg-transparent border-b border-dashed border-border focus:outline-none focus:border-orange-500 pb-0.5 transition-colors ${
                          isViewer ? "cursor-not-allowed opacity-60" : ""
                        }`}
                      />
                    ) : (
                      <p className="text-xs sm:text-sm font-bold text-foreground">
                        {f.mockTestName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${getStatusColor(f.status)}`}
                    >
                      {getStatusIcon(f.status)}
                      {f.status === "queued"
                        ? "Queued"
                        : f.status === "processing"
                          ? `${f.progress}%`
                          : f.status === "done"
                            ? "Done"
                            : "Error"}
                    </span>
                    {!started && (
                      <button
                        disabled={isViewer}
                        onClick={() => removeFile(f.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isViewer
                            ? "cursor-not-allowed opacity-30 text-muted-foreground"
                            : "hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
