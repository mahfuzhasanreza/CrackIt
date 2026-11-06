import type { PresentationAudience } from "@/generated/prisma/enums";

export const AUDIENCE_LABEL: Record<PresentationAudience, string> = {
  SELF: "Self (mirror)",
  RECORDED: "Recorded",
  MOCK_PANEL: "Mock panel",
  LIVE: "Live audience",
};
