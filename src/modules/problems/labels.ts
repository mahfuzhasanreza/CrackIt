import type { ProblemDifficulty, ProblemPlatform, ProblemStatus } from "@/generated/prisma/enums";

export const PLATFORM_LABEL: Record<ProblemPlatform, string> = {
  LEETCODE: "LeetCode",
  CODEFORCES: "Codeforces",
  HACKERRANK: "HackerRank",
  ATCODER: "AtCoder",
  GEEKSFORGEEKS: "GeeksforGeeks",
  CODECHEF: "CodeChef",
  OTHER: "Other",
};

export const DIFFICULTY_LABEL: Record<ProblemDifficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const STATUS_LABEL: Record<ProblemStatus, string> = {
  TODO: "To do",
  ATTEMPTED: "Attempted",
  SOLVED: "Solved",
  NEEDS_REVISION: "Needs revision",
};
