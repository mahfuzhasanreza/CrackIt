import type {
  ApplicationStatus,
  InterviewOutcome,
  InterviewRound,
  OrganizationType,
} from "@/generated/prisma/enums";

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  OA: "Online assessment",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const ROUND_LABEL: Record<InterviewRound, string> = {
  SCREENING: "Screening",
  OA: "Online assessment",
  TECHNICAL: "Technical",
  SYSTEM_DESIGN: "System design",
  BEHAVIORAL: "Behavioral",
  HR: "HR",
  TEACHING_DEMO: "Teaching demo",
  VIVA: "Viva",
  WRITTEN: "Written test",
};

export const OUTCOME_LABEL: Record<InterviewOutcome, string> = {
  PENDING: "Pending",
  PASSED: "Passed",
  FAILED: "Didn't pass",
  CANCELLED: "Cancelled",
};

export const ORG_TYPE_LABEL: Record<OrganizationType, string> = {
  COMPANY: "Company",
  UNIVERSITY: "University",
};

/** Badge style per outcome (server- and client-safe, unlike exports of client modules). */
export const OUTCOME_BADGE: Record<InterviewOutcome, "default" | "secondary" | "outline"> = {
  PENDING: "outline",
  PASSED: "default",
  FAILED: "secondary",
  CANCELLED: "outline",
};
