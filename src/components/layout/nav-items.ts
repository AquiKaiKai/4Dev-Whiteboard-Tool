import {
  Activity, BarChart3, CalendarRange, CheckSquare, FolderKanban, GitBranch,
  LayoutDashboard, PenTool, Settings, Users, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "My Tasks", to: "/tasks", icon: CheckSquare },
  { label: "Development Maps", to: "/maps", icon: GitBranch },
  { label: "Whiteboards", to: "/whiteboards", icon: PenTool },
  { label: "Team", to: "/team", icon: Users },
  { label: "Activity", to: "/activity", icon: Activity },
];

export const secondaryNav: NavItem[] = [{ label: "Settings", to: "/settings", icon: Settings }];

/** Reachable by route; surfaced from project views in Phase 6. */
export const moduleRoutes = { timeline: CalendarRange, analytics: BarChart3 };
