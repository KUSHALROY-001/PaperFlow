import { useEffect, useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import CreateClusterModal from "./CreateClusterModal";
import Sidebar from "./app-shell/Sidebar";
import MobileNavDrawer from "./app-shell/MobileNavDrawer";
import TopBar from "./app-shell/TopBar";
import GuestWorkspaceBanner from "./app-shell/GuestWorkspaceBanner";

// Restructured from a single 793-line file into components/app-shell/ -
// this component now only owns what's genuinely cross-cutting (mobile nav
// open/close, the create-cluster modal, and the badge-count queries that
// feed both the sidebar AND the topbar's notification bell). Everything
// else that used to live inline here (the sidebar itself, the mobile
// drawer chrome, the topbar's search/subscriptions/user-menu, the guest
// banner) is now self-contained in its own file under app-shell/ - most
// of them read their own auth/location state directly rather than having
// it threaded down as props, which is what let AppShell stop needing
// useAuth() at all.
export default function AppShell() {
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: myInvitationsData } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: api.listMyInvitations,
    refetchInterval: 60_000,
  });
  const pendingInviteCount = myInvitationsData?.invitations?.length || 0;

  // Short staleTime + refetch-on-focus (not a long interval) - this badge
  // is meant to feel "live" while a reviewer is actually working the
  // queue in another tab, without hammering the endpoint on a timer while
  // they're off doing something else entirely.
  const { data: reviewQueueCountData } = useQuery({
    queryKey: ["review-queue-count", null, null, false],
    queryFn: () => api.getReviewQueueCount(),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const { data: duplicatesCountData } = useQuery({
    queryKey: ["duplicates-count"],
    queryFn: api.countPendingDuplicates,
    refetchInterval: 60_000,
  });
  const navBadges = {
    "/review-queue": reviewQueueCountData?.count || 0,
    "/duplicates": duplicatesCountData?.count || 0,
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const openClusterModal = () => {
    setMobileNavOpen(false);
    setShowModal(true);
  };

  const isEditorRoute = location.pathname.includes("/editor");

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Sidebar */}
      {!isEditorRoute && (
        <aside className="hidden lg:flex w-55 bg-card border-r border-border flex-col fixed h-full z-40">
          <Sidebar
            location={location}
            onNavigate={() => {}}
            onCreateCluster={openClusterModal}
            badges={navBadges}
          />
        </aside>
      )}

      {!isEditorRoute && (
        <MobileNavDrawer
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          location={location}
          onCreateCluster={openClusterModal}
          badges={navBadges}
        />
      )}

      {/* Main content */}
      <div
        className={`min-h-screen flex flex-col ${isEditorRoute ? "" : "lg:ml-55"}`}
      >
        {!isEditorRoute && (
          <TopBar
            location={location}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            pendingInviteCount={pendingInviteCount}
          />
        )}

        {!isEditorRoute && <GuestWorkspaceBanner />}

        <main
          className={`flex-1 min-w-0 ${isEditorRoute ? "p-0" : "p-2 sm:p-6"}`}
        >
          <Outlet />
        </main>
      </div>

      {showModal && <CreateClusterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
