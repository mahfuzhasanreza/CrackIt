import type { DemoAudience, PublicationStatus } from "@/generated/prisma/enums";

export const AUDIENCE_LABEL: Record<DemoAudience, string> = {
  SELF: "Self (mirror)",
  RECORDED: "Recorded",
  MOCK_PANEL: "Mock panel",
  LIVE_CLASS: "Live class",
};

export const PUBLICATION_STATUS_LABEL: Record<PublicationStatus, string> = {
  IDEA: "Idea",
  WRITING: "Writing",
  SUBMITTED: "Submitted",
  ACCEPTED: "Accepted",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};
