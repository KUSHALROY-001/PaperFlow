import {
  LayoutDashboard,
  FolderOpen,
  Zap,
  Settings,
  Users,
  UserPlus,
  CreditCard,
  Library,
  BookMarked,
  ListChecks,
  GraduationCap,
  Globe,
  Copy,
} from "lucide-react";

export const navSections = [
  {
    label: null,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
      { icon: FolderOpen, label: "Clusters", to: "/clusters" },
      { icon: Zap, label: "Active Jobs", to: "/jobs" },
      {
        icon: ListChecks,
        label: "Review Queue",
        to: "/review-queue",
        hasInfo: true,
      },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: Library, label: "Templates", to: "/templates" },
      {
        icon: BookMarked,
        label: "Question Bank",
        to: "/question-bank",
        hasInfo: true,
      },
      { icon: Copy, label: "Duplicates", to: "/duplicates", hasInfo: true },
      { icon: Globe, label: "Public Mock Tests", to: "/public-mocktest" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { icon: Users, label: "Team", to: "/team" },
      {
        icon: GraduationCap,
        label: "Students",
        to: "/students",
        hasInfo: true,
      },
      { icon: UserPlus, label: "Invitations", to: "/invitations" },
      { icon: CreditCard, label: "Billing", to: "/billing" },
      { icon: Settings, label: "Settings", to: "/settings" },
    ],
  },
];

const roleLabels = {
  owner: "Owner",
  admin: "an Admin",
  editor: "an Editor",
  viewer: "a Viewer",
};

export function roleLabelFor(role) {
  return roleLabels[role] || role;
}
