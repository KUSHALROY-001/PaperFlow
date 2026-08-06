import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Extracted from pages/Team.jsx — same behavior, plus one optimization:
// the handlers below are wrapped in useCallback (with queryClient as their
// only real dependency, which never changes) so they keep a stable identity
// across renders. That's what lets a memoized MemberRow/InviteRow actually
// skip re-rendering when e.g. `search` changes, instead of every row
// re-rendering just because the page re-rendered.
export function useTeam() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviteError, setInviteError] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [actionError, setActionError] = useState("");

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: api.listTeamMembers,
  });
  const { data: invitesData, isLoading: invitesLoading } = useQuery({
    queryKey: ["team-invitations"],
    queryFn: api.listSentInvitations,
  });

  const members = membersData?.members || [];
  const invites = invitesData?.invitations || [];

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  const refreshMembers = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["team-members"] }),
    [queryClient],
  );
  const refreshInvites = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["team-invitations"] }),
    [queryClient],
  );

  const handleChangeRole = useCallback(
    async (member, role) => {
      setOpenMenu(null);
      setActionError("");
      try {
        await api.updateTeamMemberRole(member.id, role);
        refreshMembers();
      } catch (error) {
        setActionError(error.message || "Could not change this member's role");
      }
    },
    [refreshMembers],
  );

  const handleRemove = useCallback(
    async (member) => {
      setOpenMenu(null);
      setActionError("");
      try {
        await api.removeTeamMember(member.id);
        refreshMembers();
      } catch (error) {
        setActionError(error.message || "Could not remove this member");
      }
    },
    [refreshMembers],
  );

  const handleRevoke = useCallback(
    async (invitationId) => {
      setActionError("");
      try {
        await api.revokeInvitation(invitationId);
        refreshInvites();
      } catch (error) {
        setActionError(error.message || "Could not revoke this invitation");
      }
    },
    [refreshInvites],
  );

  const toggleMenu = useCallback(
    (id) => setOpenMenu((current) => (current === id ? null : id)),
    [],
  );

  const handleCopyLink = useCallback(async (invitation) => {
    const link = `${window.location.origin}/accept-invite?token=${invitation.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedInviteId(invitation.id);
      setTimeout(() => setCopiedInviteId(null), 1500);
    } catch {
      // Clipboard API can fail (permissions, insecure context) - fall back
      // to just showing the link so it can be selected/copied by hand.
      setLastInviteLink(link);
    }
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");
    setIsInviting(true);

    try {
      const result = await api.createInvitation({
        email: inviteEmail,
        role: inviteRole,
      });
      refreshInvites();
      setInviteEmail("");
      // There's no email provider wired up yet (see team.service.js), so the
      // invite link has to be shared manually - show it right away instead
      // of pretending an email went out.
      setLastInviteLink(
        `${window.location.origin}/accept-invite?token=${result.invitation.token}`,
      );
    } catch (error) {
      setInviteError(error.message || "Could not send this invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteError("");
    setLastInviteLink("");
    setInviteEmail("");
  };

  return {
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
  };
}
