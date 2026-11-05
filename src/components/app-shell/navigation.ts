import {
  BookOpen,
  Briefcase,
  CalendarClock,
  ChartColumn,
  Code,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  ListTree,
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
      { title: "Checklists", href: "/checklists", icon: ListChecks, ready: false },
      { title: "Problems", href: "/problems", icon: Code, ready: false },
      { title: "Lecturer", href: "/lecturer", icon: GraduationCap, ready: false },
      { title: "Resources", href: "/resources", icon: BookOpen, ready: false },
    ],
  },
  {
    label: "Hunt",
    items: [
      { title: "Applications", href: "/applications", icon: Briefcase, ready: false },
      { title: "Interviews", href: "/interviews", icon: Users, ready: false },
    ],
  },
  {
    label: "Review",
    items: [
      { title: "Analytics", href: "/analytics", icon: ChartColumn, ready: false },
      { title: "Settings", href: "/settings", icon: Settings, ready: false },
    ],
  },
];
