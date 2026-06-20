import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ClipboardList,
  Clock,
  Download,
  Edit2,
  FileText,
  FolderOpen,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import ProcessingTab from "../components/cluster/ProcessingTab";
import ReviewTab from "../components/cluster/ReviewTab";
import OutputTab from "../components/cluster/OutputTab";

const mockCluster = {
  id: "jeca",
  name: "JECA",
  description: "MCA entrance preparation workspace for PYQs and practice mocks.",
  createdAt: "2026-05-20",
};

const initialMockTests = [
  {
    id: "jeca-2024",
    name: "JECA PYQ 2024",
    file: "jeca_2024_full.pdf",
    status: "Needs Review",
    progress: 100,
    questions: 78,
    lowConfidence: 5,
    topicsFound: 8,
    updated: "2 hours ago",
  },
  {
    id: "jeca-2023",
    name: "JECA PYQ 2023",
    file: "jeca_2023_set.pdf",
    status: "Ready",
    progress: 100,
    questions: 72,
    lowConfidence: 2,
    topicsFound: 7,
    updated: "1 day ago",
  },
  {
    id: "jeca-mock-1",
    name: "JECA Mock Test 1",
    file: "jeca_mock_1.pdf",
    status: "OCR Running",
    progress: 55,
    questions: 0,
    lowConfidence: 0,
    topicsFound: 0,
    updated: "12 min ago",
  },
  {
    id: "jeca-mock-2",
    name: "JECA Mock Test 2",
    file: null,
    status: "Draft",
    progress: 0,
    questions: 0,
    lowConfidence: 0,
    topicsFound: 0,
    updated: "Not started",
  },
];

const questions = [
  {
    id: 1,
    topic: "Data Structures",
    confidence: 94,
    status: "approved",
    text: "Which of the following data structures uses LIFO order?",
    sourceLine: "Page 4, line 18",
    options: ["Queue", "Stack", "Linked List", "Tree"],
    answer: "Stack",
  },
  {
    id: 2,
    topic: "Algorithms",
    confidence: 88,
    status: "review",
    text: "The time complexity of binary search is:",
    sourceLine: "Page 6, line 11",
    options: ["O(n)", "O(n^2)", "O(log n)", "O(1)"],
    answer: "O(log n)",
  },
  {
    id: 3,
    topic: "Networking",
    confidence: 66,
    status: "flagged",
    text: "Which protocol is used for secure communication over the internet?",
    sourceLine: "Page 9, line 3",
    options: ["HTTP", "FTP", "HTTPS", "SMTP"],
    answer: "HTTPS",
  },
];

const phases = [
  {
    title: "Phase 1: OCR Correction",
    icon: FileText,
    steps: [
      { label: "PDF uploaded", status: "complete" },
      { label: "OCR extracted", status: "complete" },
      { label: "Text correction running", status: "active" },
      { label: "Corrected document assembled", status: "pending" },
    ],
  },
  {
    title: "Phase 2: Mock Generation",
    icon: Sparkles,
    steps: [
      { label: "Question detection", status: "complete" },
      { label: "Option parsing", status: "complete" },
      { label: "Answer inference", status: "active" },
      { label: "Confidence scoring", status: "pending" },
    ],
  },
];

const documentPreview = [
  "Q. Which of the following data structures uses LIFO order?",
  "A. Queue",
  "B. Stack",
  "C. Linked List",
  "D. Tree",
];

const tabs = [
  { id: "mocks", label: "Mock Tests" },
  { id: "processing", label: "Processing" },
  { id: "review", label: "Review" },
  { id: "output", label: "Output" },
];

const statusConfig = {
  Ready: { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  "OCR Running": {
    color: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  "Needs Review": { color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  Draft: { color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

export default function ClusterWorkspace() {
  const [activeTab, setActiveTab] = useState("mocks");
  const [selectedMockId, setSelectedMockId] = useState(initialMockTests[0].id);
  const [mockTests] = useState(initialMockTests);

  const selectedMock = useMemo(
    () => mockTests.find((mock) => mock.id === selectedMockId) || mockTests[0],
    [mockTests, selectedMockId],
  );

  const summary = useMemo(
    () => ({
      total: mockTests.length,
      ready: mockTests.filter((mock) => mock.status === "Ready").length,
      running: mockTests.filter((mock) => mock.status === "OCR Running").length,
      review: mockTests.filter((mock) => mock.status === "Needs Review").length,
    }),
    [mockTests],
  );

  const metadata = {
    clusterId: mockCluster.id,
    clusterName: mockCluster.name,
    mockTestId: selectedMock.id,
    mockTestName: selectedMock.name,
    sourceFile: selectedMock.file || "Not uploaded",
    generatedAt: "2026-06-18",
  };

  return (
    <div className="space-y-6">
      <div className="card-lavender rounded-2xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                <FolderOpen className="h-5 w-5 text-violet-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {mockCluster.name}
              </h1>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
                Cluster
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {mockCluster.description}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Created {mockCluster.createdAt}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-all hover:border-violet-300 hover:text-violet-600">
              <Edit2 className="w-4 h-4" /> Edit Cluster
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl gradient-violet px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              <Plus className="w-4 h-4" /> New Mock Test
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: "Mock Tests",
              value: summary.total,
              icon: ClipboardList,
              color: "text-violet-600 bg-violet-100",
            },
            {
              label: "Ready",
              value: summary.ready,
              icon: CheckCircle,
              color: "text-emerald-600 bg-emerald-100",
            },
            {
              label: "Running",
              value: summary.running,
              icon: Zap,
              color: "text-indigo-600 bg-indigo-100",
            },
            {
              label: "Needs Review",
              value: summary.review,
              icon: AlertCircle,
              color: "text-amber-600 bg-amber-100",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="gradient-card rounded-xl p-3 flex items-center gap-3"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}
              >
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-lavender rounded-2xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Selected Mock Test
            </p>
            <select
              value={selectedMockId}
              onChange={(event) => setSelectedMockId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-violet-300 md:w-72"
            >
              {mockTests.map((mock) => (
                <option key={mock.id} value={mock.id}>
                  {mock.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50">
              <Upload className="w-4 h-4" /> Upload PDF
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50">
              <Download className="w-4 h-4" /> Export
            </button>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 text-muted-foreground transition-all hover:border-red-200 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto bg-violet-50 border border-border rounded-2xl p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-w-fit flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "gradient-violet text-white shadow-lg shadow-violet-200"
                : "text-muted-foreground hover:text-violet-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "mocks" && (
        <MockTestsTab
          mockTests={mockTests}
          selectedMockId={selectedMockId}
          onSelect={(mockId) => {
            setSelectedMockId(mockId);
            setActiveTab("processing");
          }}
        />
      )}
      {activeTab === "processing" && (
        <ProcessingTab phases={phases} documentPreview={documentPreview} />
      )}
      {activeTab === "review" && (
        <ReviewTab
          questions={questions}
          onStatusChange={() => {}}
          onDelete={() => {}}
        />
      )}
      {activeTab === "output" && (
        <OutputTab questions={questions} metadata={metadata} />
      )}
    </div>
  );
}

function MockTestsTab({ mockTests, selectedMockId, onSelect }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Mock Tests</h2>
          <p className="text-sm text-muted-foreground">
            Add many mock tests under this one cluster.
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl gradient-violet px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          <Plus className="w-4 h-4" /> New Mock Test
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {mockTests.map((mock) => {
          const status = statusConfig[mock.status] || statusConfig.Draft;
          const selected = mock.id === selectedMockId;

          return (
            <div
              key={mock.id}
              className={`rounded-2xl p-5 transition-all card-lavender ${
                selected ? "ring-2 ring-violet-400" : "hover:shadow-lg"
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground">{mock.name}</h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {mock.file || "No PDF uploaded yet"}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {mock.status}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-violet-50 p-2 text-center">
                  <div className="text-base font-bold text-violet-700">
                    {mock.questions}
                  </div>
                  <div className="text-[11px] font-medium text-violet-700">
                    Questions
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 text-center">
                  <div className="text-base font-bold text-amber-700">
                    {mock.lowConfidence}
                  </div>
                  <div className="text-[11px] font-medium text-amber-700">
                    Low conf.
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2 text-center">
                  <div className="text-base font-bold text-emerald-700">
                    {mock.topicsFound}
                  </div>
                  <div className="text-[11px] font-medium text-emerald-700">
                    Topics
                  </div>
                </div>
              </div>

              {mock.progress > 0 && (
                <div className="mb-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Processing progress</span>
                    <span>{mock.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-violet-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${mock.progress}%`,
                        background:
                          mock.progress === 100
                            ? "#10B981"
                            : "linear-gradient(90deg, #7C3AED, #4F46E5)",
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {mock.updated}
                </span>
                <button
                  type="button"
                  onClick={() => onSelect(mock.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-200"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
