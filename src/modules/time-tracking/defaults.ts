import type { ActivityCategory } from "@/generated/prisma/enums";

/** Starter activity types created for every new user (editable later in Settings). */
export type DefaultActivityType = {
  name: string;
  color: string;
  category: ActivityCategory;
  isProductive: boolean;
};

export const DEFAULT_ACTIVITY_TYPES: DefaultActivityType[] = [
  { name: "Study", color: "#2563eb", category: "STUDY", isProductive: true },
  { name: "Practice / Mock", color: "#0891b2", category: "STUDY", isProductive: true },
  { name: "Sleep", color: "#4f46e5", category: "SLEEP", isProductive: false },
  { name: "Break / Gap", color: "#9ca3af", category: "BREAK", isProductive: false },
  { name: "Meal", color: "#f59e0b", category: "PERSONAL", isProductive: false },
  { name: "Prayer", color: "#10b981", category: "PERSONAL", isProductive: false },
  { name: "Exercise", color: "#16a34a", category: "EXERCISE", isProductive: false },
  { name: "Commute", color: "#a16207", category: "OTHER", isProductive: false },
  { name: "Work / Job", color: "#64748b", category: "WORK", isProductive: false },
  { name: "Social / Phone", color: "#ec4899", category: "OTHER", isProductive: false },
  { name: "Other", color: "#78716c", category: "OTHER", isProductive: false },
];
