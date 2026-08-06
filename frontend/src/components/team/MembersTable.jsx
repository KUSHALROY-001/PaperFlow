import MemberRow from "./MemberRow";

// Extracted from pages/Team.jsx — no behavior changes.
export default function MembersTable({
  members,
  filtered,
  membersLoading,
  openMenu,
  onToggleMenu,
  onChangeRole,
  onRemove,
}) {
  return (
    // Note: no overflow-hidden here anymore. It was clipping MemberRow's
    // absolutely-positioned "Change Role" dropdown whenever it needed to
    // extend past the table's own bottom edge (happens easily with only a
    // few rows, since the table is short). Rounded-2xl + border still give
    // the same rounded-card look; the only trade-off is a barely-visible
    // square corner on hover right at the very top/bottom edge of the first
    // /last row, since those rows don't carry their own border-radius.
    <div className="surface-card rounded-2xl border border-border">
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between sm:justify-start rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            Active Members
          </span>
          <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">
            {members.length}
          </span>
        </div>
      </div>
      {membersLoading && (
        <div className="px-6 py-6 text-xs text-muted-foreground">
          Loading members...
        </div>
      )}
      <div className="divide-y divide-border [&>*:last-child]:rounded-b-2xl">
        {filtered.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            isMenuOpen={openMenu === m.id}
            onToggleMenu={onToggleMenu}
            onChangeRole={onChangeRole}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
