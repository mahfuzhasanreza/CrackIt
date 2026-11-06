import {
  BookOpen,
  Briefcase,
  CalendarClock,
  ChartColumn,
  Code,
  FolderGit2,
  LayoutDashboard,
  ListChecks,
  ListTree,
  MessagesSquare,
  type LucideIcon,
  NotebookPen,
  Settings,
  Timer,
  Users,
} from "lucide-react";

export type NavItem = { title: string; href: string; icon: LucideIcon; ready: boolean };
export type NavGroup = { label: string; items: NavItem[] };

/** Flip `ready` to true as each phase ships its page. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Track",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, ready: true },
      { title: "Timer", href: "/timer", icon: Timer, ready: true },
      { title: "Timeline", href: "/timeline", icon: CalendarClock, ready: true },
      { title: "Journal", href: "/journal", icon: NotebookPen, ready: true },
    ],
  },
  {
    label: "Prepare",
    items: [
      { title: "Topics", href: "/topics", icon: ListTree, ready: true },
      { title: "Checklists", href: "/checklists", icon: ListChecks, ready: true },
      { title: "Problems", href: "/problems", icon: Code, ready: true },
      { title: "Projects", href: "/projects", icon: FolderGit2, ready: true },
      { title: "Practice", href: "/practice", icon: MessagesSquare, ready: true },
      { title: "Resources", href: "/resources", icon: BookOpen, ready: true },
    ],
  },
  {
    label: "Hunt",
    items: [
      { title: "Applications", href: "/applications", icon: Briefcase, ready: true },
      { title: "Interviews", href: "/interviews", icon: Users, ready: true },
    ],
  },
  {
    label: "Review",
    items: [
      { title: "Analytics", href: "/analytics", icon: ChartColumn, ready: true },
      { title: "Settings", href: "/settings", icon: Settings, ready: true },
    ],
  },
];
