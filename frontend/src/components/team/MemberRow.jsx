import { memo } from "react";
import {
  CheckCircle,
  Mail,
  MoreVertical,
  Trash2,
  FolderKanban,
  Calendar,
} from "lucide-react";
import {
  ASSIGNABLE_ROLES,
  roleColors,
  roleLabel,
} from "@/utils/teamHelpers";
import { formatDate } from "@/lib/date";
import UserAvatar from "@/components/shared/UserAvatar";

function MemberRow({
  member,
  isMenuOpen,
  onToggleMenu,
  onChangeRole,
  onRemove,
}) {
  return (
    <div className="px-3.5 sm:px-6 py-3.5 sm:py-4 hover:bg-muted/40 transition-colors relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      {/* User Info Section */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <UserAvatar
          src={member.avatarUrl}
          name={member.name}
          seed={member.id || member.email}
          rounded="3xl"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-foreground truncate">
            {member.name}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
        </div>
      </div>

      {/* Meta Info & Actions Section */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto">
        {/* Mobile Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium sm:hidden">
          <span className="flex items-center gap-1">
            <FolderKanban className="w-3 h-3 text-orange-500" />
            {member.clustersCreated}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            {formatDate(member.joinedAt)}
          </span>
        </div>

        {/* Desktop Metadata */}
        <div className="text-xs text-muted-foreground hidden sm:block font-medium shrink-0">
          {member.clustersCreated} clusters
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block font-medium shrink-0">
          Joined {formatDate(member.joinedAt)}
        </div>

        {/* Role & Menu Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0 ${roleColors[member.role]}`}
          >
            {roleLabel(member.role)}
          </span>

          {member.role !== "owner" && (
            <div className="relative">
              <button
                onClick={() => onToggleMenu(member.id)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                title="Member options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-card rounded-2xl shadow-xl border border-border p-2 z-30">
                  <div className="text-[11px] font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                    Change Role
                  </div>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => onChangeRole(member, r.value)}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors ${member.role === r.value ? "bg-orange-500/15 text-orange-500 font-bold" : "hover:bg-muted text-foreground"}`}
                    >
                      {member.role === r.value && (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      {r.label}
                    </button>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => onRemove(member)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {member.role === "owner" && (
            <span className="text-[10px] text-muted-foreground italic shrink-0">
              Owner
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(MemberRow);
