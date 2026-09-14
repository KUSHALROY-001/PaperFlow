import {
  Download,
  Pencil,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { colorMap } from "@/utils/templateHelpers";
import { useAuth } from "@/lib/AuthContext";
import UserAvatar from "@/components/shared/UserAvatar";

function formatPublishedDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function TemplatePublisher({ template, className = "" }) {
  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${className}`}>
      <span className="max-w-28 truncate text-[11px] font-semibold text-foreground">
        {template.publisherName}
      </span>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        {formatPublishedDate(template.publishedAt)}
      </span>
    </div>
  );
}

export default function TemplateCard({
  template,
  onPreview,
  onApply,
  onEdit,
  onDelete,
  onUpdateVisibility,
  isVisibilityUpdating,
}) {
  const { isViewer, isAdmin } = useAuth();

  let difficultyClass;
  if (template.difficulty === "Easy") {
    difficultyClass = "text-emerald-500";
  } else if (template.difficulty === "Medium") {
    difficultyClass = "text-amber-500";
  } else {
    difficultyClass = "text-red-500";
  }

  const handleCardClick = (event) => {
    if (event.target.closest?.("button, a, input, select, textarea")) {
      return;
    }
    onPreview(template);
  };

  const handleCardKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPreview(template);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="surface-card cursor-pointer rounded-2xl p-5 border border-border hover:border-orange-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <UserAvatar
          src={template.publisherAvatarUrl}
          name={template.publisherName}
          seed={template.createdBy || template.publisherName || template.id}
          size="lg"
          rounded="xl"
        />
        <TemplatePublisher template={template} className="sm:hidden -mt-2" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {template.name}
                </h3>
                <TemplatePublisher
                  template={template}
                  className="hidden sm:flex"
                />
                {template.isOwn && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-2.5 h-2.5" /> Yours
                  </span>
                )}
              </div>
              <span
                className={`inline-block text-[11px] px-2.5 py-0.5 mt-1 rounded-lg font-semibold ${colorMap[template.color] || colorMap.orange}`}
              >
                {template.category}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 flex-wrap text-sm">
              <span
                className="flex items-center gap-1 mr-3"
                title="Times this template has been applied"
              >
                <Users className="w-3.5 h-3.5 text-orange-500" />{" "}
                {template.uses || 0} {template.uses === 1 ? "use" : "uses"}
              </span>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-foreground">
                {template.rating ?? "—"}
              </span>
              {template.ratingCount > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  ({template.ratingCount})
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {template.description}
          </p>
          <div className="flex items-center gap-3 mt-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-orange-500" />{" "}
              {template.questions} Qs
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-orange-500" />{" "}
              {template.duration}
            </span>
            <span className={`font-semibold ${difficultyClass}`}>
              {template.difficulty}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              disabled={isViewer}
              onClick={() => !isViewer && onApply(template)}
              title={
                isViewer
                  ? "Editor role is required to apply templates"
                  : undefined
              }
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-md transition-all ${
                isViewer
                  ? "bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50 border border-border"
                  : "bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 hover:bg-orange-500/20"
              }`}
            >
              <Download className="w-3.5 h-3.5 text-orange-500" /> Apply
              Template
            </button>
            {template.isOwn && (
              <>
                <div className="flex items-center justify-center gap-2 shrink-0">
                  <div className="group/visibility relative h-9 w-11">
                    <span
                      className={`hidden sm:flex absolute inset-0 items-center justify-center rounded-full text-[9px] font-bold transition-opacity group-hover/visibility:opacity-0 group-focus-within/visibility:opacity-0 ${
                        template.isPublic
                          ? "bg-orange-500/15 text-orange-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {template.isPublic ? "Public" : "Private"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={template.isPublic}
                      disabled={isViewer || isVisibilityUpdating}
                      onClick={() =>
                        !isViewer &&
                        !isVisibilityUpdating &&
                        onUpdateVisibility(template, !template.isPublic)
                      }
                      title={
                        isViewer
                          ? "Editor role is required to change template visibility"
                          : template.isPublic
                            ? "Make this template private"
                            : "Make this template public"
                      }
                      className={`absolute inset-x-0 top-1.5 opacity-100 sm:opacity-0 sm:group-hover/visibility:opacity-100 sm:group-focus-within/visibility:opacity-100 inline-flex h-6 w-11 items-center rounded-full transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${
                        template.isPublic
                          ? "bg-orange-500"
                          : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          template.isPublic ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <span className="sm:hidden text-xs font-semibold text-foreground">
                    {template.isPublic ? "Public" : "Private"}
                  </span>
                </div>
                <button
                  disabled={isViewer}
                  onClick={() => !isViewer && onEdit(template)}
                  title={
                    isViewer
                      ? "Editor role is required to edit templates"
                      : "Edit template"
                  }
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border rounded-full transition-all ${
                    isViewer
                      ? "border-border bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
                      : "border-border bg-card text-foreground hover:bg-muted hover:border-orange-500/40"
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  disabled={!isAdmin}
                  onClick={() => isAdmin && onDelete(template)}
                  title={
                    isAdmin
                      ? "Delete template"
                      : "Admin role is required to delete templates"
                  }
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border rounded-full transition-all ${
                    isAdmin
                      ? "border-red-500/20 bg-card text-muted-foreground hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10"
                      : "border-border bg-muted text-muted-foreground/40 cursor-not-allowed opacity-50"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
