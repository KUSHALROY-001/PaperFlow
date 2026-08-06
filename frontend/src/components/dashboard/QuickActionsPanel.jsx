import { Link } from "react-router-dom";
import { BarChart2, FileText, Plus, Upload } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function QuickActionsPanel({ onNewCluster }) {
  const { isViewer } = useAuth();

  return (
    <div className="surface-card rounded-2xl p-5 border border-border">
      <h3 className="text-sm font-bold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <button
          onClick={() => !isViewer && onNewCluster?.()}
          disabled={isViewer}
          title={isViewer ? "Editor role is required to create clusters" : undefined}
          className={`group flex flex-col items-center gap-2 p-2 rounded-xl transition-colors ${
            isViewer
              ? "cursor-not-allowed opacity-50"
              : "hover:bg-muted/60"
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
            New Cluster
          </span>
        </button>

        {isViewer ? (
          <div
            title="Editor role is required to upload files"
            className="group flex flex-col items-center gap-2 p-2 rounded-xl cursor-not-allowed opacity-50"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Batch Upload
            </span>
          </div>
        ) : (
          <Link
            to="/batch"
            className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/60 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
              Batch Upload
            </span>
          </Link>
        )}

        <Link
          to="/templates"
          className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/60 transition-colors"
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
            Templates
          </span>
        </Link>

        <Link
          to="/analytics"
          className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-muted/60 transition-colors"
        >
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BarChart2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
            Analytics
          </span>
        </Link>
      </div>
    </div>
  );
}
