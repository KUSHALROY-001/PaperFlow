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

const templates = [
  "GATE CS",
  "JECA Entrance",
  "JEE Mains",
  "Custom (Auto-detect)",
];

function getStatusColor(status) {
  if (status === "queued") return "bg-gray-100 text-gray-600";
  if (status === "processing") return "bg-violet-100 text-violet-700";
  if (status === "done") return "bg-emerald-100 text-emerald-700";
  if (status === "error") return "bg-red-100 text-red-600";
  return "bg-gray-100 text-gray-600";
}

function getStatusIcon(status) {
  if (status === "queued") return <Clock className="w-3.5 h-3.5" />;
  if (status === "processing")
    return <Zap className="w-3.5 h-3.5 animate-pulse" />;
  if (status === "done") return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === "error") return <AlertCircle className="w-3.5 h-3.5" />;
}

export default function BatchUpload() {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [template, setTemplate] = useState("Custom (Auto-detect)");
  const [started, setStarted] = useState(false);

  const addFiles = useCallback((newFiles) => {
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
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (id) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const updateName = (id, name) =>
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, mockTestName: name } : f)),
    );

  const handleStart = () => {
    setStarted(true);
    // Simulate processing
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
        <h1 className="text-2xl font-bold text-foreground">Batch Upload</h1>
        <p className="text-sm text-muted-foreground mt-1">
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
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => document.getElementById("batch-upload").click()}
          className={`border-2 border-dashed rounded-3xl p-6 sm:p-12 text-center cursor-pointer transition-all ${
            dragging
              ? "border-violet-500 bg-violet-50"
              : "border-border hover:border-violet-400 hover:bg-violet-50/50"
          }`}
        >
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-violet-600" />
          </div>
          <p className="text-lg font-bold text-foreground mb-1">
            Drop your PDFs here
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            or click to browse · PDF only · max 50MB each · no limit on count
          </p>
          <p className="text-xs text-violet-600">
            Each PDF will become its own mock test
          </p>
          <input
            id="batch-upload"
            type="file"
            accept=".pdf"
            multiple
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
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  {templates.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={handleStart}
                  disabled={files.length === 0}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 gradient-violet text-white font-semibold rounded-xl shadow-lg shadow-violet-200 hover:opacity-90 transition-all text-sm"
                >
                  <Play className="w-4 h-4" /> Start Processing
                </button>
              </div>
            )}
          </div>

          {/* Summary bar when processing */}
          {started && (
            <div className="card-lavender rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-semibold text-foreground">
                    {allDone
                      ? "All mock tests created!"
                      : `Processing ${files.filter((f) => f.status === "processing").length} mock tests...`}
                  </span>
                  <span className="text-muted-foreground">
                    {files.filter((f) => f.status === "done").length}/
                    {files.length} done
                  </span>
                </div>
                <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((files.filter((f) => f.status === "done").length / files.length) * 100)}%`,
                      background: allDone
                        ? "#10B981"
                        : "linear-gradient(90deg, #7C3AED, #4F46E5)",
                    }}
                  />
                </div>
              </div>
              {allDone && (
                <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
              )}
            </div>
          )}

          <div className="space-y-3">
            {files.map((f) => (
              <div
                key={f.id}
                className={`card-lavender rounded-2xl p-4 transition-all ${f.status === "done" ? "border-emerald-200" : f.status === "error" ? "border-red-200" : ""}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${f.status === "done" ? "bg-emerald-100" : f.status === "processing" ? "bg-violet-100" : "bg-gray-100"}`}
                  >
                    <FileText
                      className={`w-5 h-5 ${f.status === "done" ? "text-emerald-600" : f.status === "processing" ? "text-violet-600" : "text-gray-400"}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {!started ? (
                      <input
                        value={f.mockTestName}
                        onChange={(e) => updateName(f.id, e.target.value)}
                        className="w-full text-sm font-semibold text-foreground bg-transparent border-b border-dashed border-border focus:outline-none focus:border-violet-500 pb-0.5 transition-colors"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-foreground">
                        {f.mockTestName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    {f.status === "processing" && (
                      <div className="mt-2 h-1.5 bg-violet-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${f.progress}%`,
                            background:
                              "linear-gradient(90deg, #7C3AED, #4F46E5)",
                          }}
                        />
                      </div>
                    )}
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
                        onClick={() => removeFile(f.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-100 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!started && (
            <button
              onClick={() => document.getElementById("batch-upload").click()}
              className="w-full py-3 border-2 border-dashed border-border text-violet-600 text-sm font-semibold rounded-2xl hover:bg-violet-50 transition-all"
            >
              + Add More Files
            </button>
          )}
        </div>
      )}

      {/* Empty instructions */}
      {files.length === 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              title: "Upload PDFs",
              desc: "Drag & drop multiple PDF files. Each becomes an independent cluster.",
            },
            {
              step: "02",
              title: "Name Mock Tests",
              desc: "Auto-named from filenames. Edit any mock test name before processing.",
            },
            {
              step: "03",
              title: "Start Queue",
              desc: "All PDFs are processed sequentially. Monitor live progress per file.",
            },
          ].map((s, i) => (
            <div key={i} className="card-lavender rounded-2xl p-5">
              <div className="text-3xl font-black text-violet-200 mb-3">
                {s.step}
              </div>
              <h3 className="font-bold text-foreground mb-1">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
