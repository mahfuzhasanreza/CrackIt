export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://crackit:crackit@localhost:5434/crackit_test";

export const USERS = {
  main: { email: "e2e@crackit.local", password: "e2e-password-1234", name: "E2E User" },
  timer: { email: "e2e-timer@crackit.local", password: "timer-password-1234", name: "Timer User" },
  reset: { email: "e2e-reset@crackit.local", password: "reset-password-1234", name: "Reset User" },
  topics: {
    email: "e2e-topics@crackit.local",
    password: "topics-password-1234",
    name: "Topics User",
  },
  checklists: {
    email: "e2e-checklists@crackit.local",
    password: "checklists-password-1234",
    name: "Checklists User",
  },
  journal: {
    email: "e2e-journal@crackit.local",
    password: "journal-password-1234",
    name: "Journal User",
  },
} as const;
