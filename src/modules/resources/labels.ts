import {
  BookOpen,
  CirclePlay,
  FileText,
  GraduationCap,
  ListChecks,
  type LucideIcon,
  Newspaper,
} from "lucide-react";

import type { ResourceStatus, ResourceType } from "@/generated/prisma/enums";

export const TYPE_LABEL: Record<ResourceType, string> = {
  BOOK: "Book",
  COURSE: "Course",
  VIDEO: "Video series",
  ARTICLE: "Article",
  SHEET: "Problem sheet",
  OTHER: "Other",
};

export const TYPE_ICON: Record<ResourceType, LucideIcon> = {
  BOOK: BookOpen,
  COURSE: GraduationCap,
  VIDEO: CirclePlay,
  ARTICLE: Newspaper,
  SHEET: ListChecks,
  OTHER: FileText,
};

export const STATUS_LABEL: Record<ResourceStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  DROPPED: "Dropped",
};
