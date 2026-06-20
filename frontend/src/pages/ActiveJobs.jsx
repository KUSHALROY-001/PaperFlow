import { Link } from "react-router-dom";
import { Zap, ArrowRight, Clock, CheckCircle } from "lucide-react";

const jobs = [
  {
    id: "c1",
    cluster: "JECA",
    name: "JECA Mock Test 1",
    phase: "Phase 1",
    substep: "OCR extraction",
    percent: 55,
    eta: "~3 min remaining",
  },
  {
    id: "c4",
    cluster: "Aptitude",
    name: "Aptitude Mock Batch 1",
    phase: "Phase 1",
    substep: "Text correction",
    percent: 82,
    eta: "~1 min remaining",
  },
];

const completed = [
  {
    id: "c1",
    cluster: "JECA",
    name: "JECA PYQ 2024",
    phase: "Phase 2 Complete",
    duration: "10m 40s",
    at: "10:55 AM",
  },
  {
    id: "c5",
    cluster: "Network Security",
    name: "Network Security PYQ",
    phase: "Phase 2 Complete",
    duration: "8m 12s",
    at: "Yesterday",
  },
];

export default function ActiveJobs() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Active Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Monitor mock-test processing jobs across all clusters
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-violet-500 pulse-violet" />
          <h2 className="text-lg font-bold text-foreground">
            Running Now ({jobs.length})
          </h2>
        </div>
        {jobs.length === 0 ? (
          <div className="card-lavender rounded-2xl p-12 text-center">
            <Zap className="w-10 h-10 text-violet-300 mx-auto mb-3" />
            <p className="text-foreground font-semibold mb-1">No active jobs</p>
            <p className="text-sm text-muted-foreground">
              All mock-test pipelines are idle
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={`${job.id}-${job.name}`} className="card-lavender rounded-2xl p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{job.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {job.cluster} · {job.phase} · {job.substep}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/cluster/${job.id}`}
                    className="flex w-full sm:w-auto items-center justify-center gap-1.5 text-sm px-4 py-2 gradient-violet text-white font-semibold rounded-xl shadow-md shadow-violet-200 hover:opacity-90 transition-all"
                  >
                    View Cluster <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>{job.percent}% complete</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {job.eta}
                  </span>
                </div>
                <div className="h-2.5 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full shimmer"
                    style={{ width: `${job.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">
          Recently Completed
        </h2>
        <div className="space-y-3">
          {completed.map((job) => (
            <div
              key={`${job.id}-${job.name}`}
              className="card-lavender rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{job.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {job.cluster} · {job.phase} · {job.duration} · {job.at}
                </p>
              </div>
              <Link
                to={`/cluster/${job.id}`}
                className="flex w-full sm:w-auto items-center justify-center gap-1.5 text-sm px-3 py-2 bg-violet-100 text-violet-700 font-semibold rounded-xl hover:bg-violet-200 transition-colors"
              >
                Open Cluster <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
