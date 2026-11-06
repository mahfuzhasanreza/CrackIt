import type { GoalMetric, GoalPeriod } from "@/generated/prisma/enums";

const PER: Record<GoalPeriod, string> = { DAY: "a day", WEEK: "a week", MONTH: "a month" };
export const CURRENT: Record<GoalPeriod, string> = {
  DAY: "Today",
  WEEK: "This week",
  MONTH: "This month",
};

/** A goal amount in its unit: minutes → "2h 30m", counts → "3 problems". */
export function formatGoalAmount(metric: GoalMetric, value: number): string {
  if (metric === "STUDY_MINUTES") {
    const total = Math.round(value);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const noun =
    metric === "PROBLEMS_SOLVED"
      ? value === 1
        ? "problem"
        : "problems"
      : value === 1
        ? "learning note"
        : "learning notes";
  return `${value} ${noun}`;
}

/** "10h of SWE / Full-Stack study a week", "1 problem a day". */
export function goalTitle(g: {
  metric: GoalMetric;
  period: GoalPeriod;
  target: number;
  track: { name: string } | null;
}): string {
  if (g.metric === "STUDY_MINUTES") {
    return `${formatGoalAmount(g.metric, g.target)} of ${g.track ? `${g.track.name} ` : ""}study ${PER[g.period]}`;
  }
  return `${formatGoalAmount(g.metric, g.target)} ${PER[g.period]}`;
}

/** The achieved side of "x of target": study as a duration, counts as a bare number. */
export function formatGoalActual(metric: GoalMetric, value: number): string {
  return metric === "STUDY_MINUTES" ? formatGoalAmount(metric, value) : String(value);
}
