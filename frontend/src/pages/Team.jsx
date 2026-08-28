import { Plus, Search } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import TeamStatsRow from "../components/team/TeamStatsRow";
import MembersTable from "../components/team/MembersTable";
import PendingInvitesList from "../components/team/PendingInvitesList";
import InviteMemberModal from "../components/team/InviteMemberModal";

export default function Team() {
  const {
    search,
    setSearch,
    showInviteModal,
    setShowInviteModal,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviteError,
    isInviting,
    lastInviteLink,
    openMenu,
    toggleMenu,
    copiedInviteId,
    actionError,
    membersLoading,
    invitesLoading,
    members,
    invites,
    filtered,
    handleChangeRole,
    handleRemove,
    handleRevoke,
    handleCopyLink,
    handleInvite,
    closeInviteModal,
  } = useTeam();

  return (
    <div className="p-0 sm:p-2 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Team
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage who has access to your MockCraft workspace.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 bg-blue-500/15 hover:bg-blue-600 text-foreground hover:text-white border border-blue-500 font-semibold rounded-md shadow-xs transition-all text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
          {actionError}
        </div>
      )}

      <TeamStatsRow members={members} invites={invites} />

      {/* Search */}
      <div className="relative max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full pl-9 pr-4 py-2.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-xs sm:text-sm"
        />
      </div>

      <MembersTable
        members={members}
        filtered={filtered}
        membersLoading={membersLoading}
        openMenu={openMenu}
        onToggleMenu={toggleMenu}
        onChangeRole={handleChangeRole}
        onRemove={handleRemove}
      />

      <PendingInvitesList
        invites={invites}
        invitesLoading={invitesLoading}
        copiedInviteId={copiedInviteId}
        onCopyLink={handleCopyLink}
        onRevoke={handleRevoke}
      />

      {showInviteModal && (
        <InviteMemberModal
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          inviteRole={inviteRole}
          setInviteRole={setInviteRole}
          inviteError={inviteError}
          isInviting={isInviting}
          lastInviteLink={lastInviteLink}
          onSubmit={handleInvite}
          onClose={closeInviteModal}
        />
      )}
    </div>
  );
}
