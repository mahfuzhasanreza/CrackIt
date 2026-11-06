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
  swe: { email: "e2e-swe@crackit.local", password: "swe-password-1234", name: "SWE User" },
  lecturer: {
    email: "e2e-lecturer@crackit.local",
    password: "lecturer-password-1234",
    name: "Lecturer User",
  },
  jobs: { email: "e2e-jobs@crackit.local", password: "jobs-password-1234", name: "Jobs User" },
  interviews: {
    email: "e2e-interviews@crackit.local",
    password: "interviews-password-1234",
    name: "Interviews User",
  },
  analytics: {
    email: "e2e-analytics@crackit.local",
    password: "analytics-password-1234",
    name: "Analytics User",
  },
  settings: {
    email: "e2e-settings@crackit.local",
    password: "settings-password-1234",
    name: "Settings User",
  },
  password: {
    email: "e2e-password@crackit.local",
    password: "password-password-1234",
    name: "Password User",
  },
  resources: {
    email: "e2e-resources@crackit.local",
    password: "resources-password-1234",
    name: "Resources User",
  },
  journal: {
    email: "e2e-journal@crackit.local",
    password: "journal-password-1234",
    name: "Journal User",
  },
} as const;
