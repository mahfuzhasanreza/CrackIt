import type {
  ApplicationStatus,
  InterviewRound,
  Prisma,
  PrismaClient,
  ProblemDifficulty,
  ProblemStatus,
  TopicStatus,
} from "../src/generated/prisma/client";
import { dateKeyToDb, logicalDateKey, parseLocalDateTime, shiftDateKey } from "../src/lib/dates";

import { seedDefaultsForUser } from "./seed-defaults";

/**
 * Fills an account with ~3 months of realistic, made-up prep data: time entries (with a timer
 * running now), journal, learning notes, problems, practice, applications and interviews,
 * resources, habits, projects and goals. All company names are fictional.
 * Dates are relative to `now`, so the data always looks current.
 *
 * Used by guest accounts (`auth/guest.ts`) and the README screenshots. Expects a user with no
 * data yet; adds the default activity types and starter tracks itself.
 */
export async function seedDemoData(
  prisma: PrismaClient,
  userId: string,
  { timezone, dayStartHour, now = new Date() }: DemoOptions,
) {
  await seedDefaultsForUser(prisma, userId, { starterTracks: true });
  const ctx = await loadContext(prisma, userId, timezone, now);
  const today = logicalDateKey(now, timezone, dayStartHour);

  await seedTopicStatuses(prisma, ctx);
  await seedTime(prisma, ctx, today);
  await seedJournal(prisma, ctx, today);
  await seedProblems(prisma, ctx, today);
  await seedPractice(prisma, ctx, today);
  await seedJobs(prisma, ctx, today);
  await seedResources(prisma, ctx, today);
  await seedChecklists(prisma, ctx, today);
  await seedProjects(prisma, ctx);
  await seedGoals(prisma, ctx, today);
}

export type DemoOptions = { timezone: string; dayStartHour: number; now?: Date };

const HISTORY_DAYS = 90;
const MIN = 60_000;

/** Small deterministic PRNG so every account gets the same-looking data. */
function random(seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return {
    rand,
    between: (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1)),
    chance: (p: number) => rand() < p,
    pickOne: <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!,
  };
}

type Ctx = Awaited<ReturnType<typeof loadContext>>;

async function loadContext(prisma: PrismaClient, userId: string, timezone: string, now: Date) {
  const [tracks, types, topics] = await Promise.all([
    prisma.track.findMany({ where: { userId } }),
    prisma.activityType.findMany({ where: { userId } }),
    prisma.topic.findMany({
      where: { userId },
      include: { children: { select: { id: true } }, parent: { select: { name: true } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const swe = tracks.find((t) => t.name === "SWE / Full-Stack")!;
  const ds = tracks.find((t) => t.name === "Data Science / ML")!;
  const leaves = topics.filter((t) => t.children.length === 0);

  /** A local wall-clock time on a date key (minutes after midnight, may be < 0 or ≥ 24h). */
  const at = (key: string, minutes: number): Date => {
    const day = shiftDateKey(key, Math.floor(minutes / 1440));
    const m = ((minutes % 1440) + 1440) % 1440;
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const d = parseLocalDateTime(`${day}T${hh}:${mm}`, timezone);
    if (!d) throw new Error(`Invalid local time ${day} ${hh}:${mm} in ${timezone}`);
    return d;
  };

  return {
    userId,
    now,
    at,
    ...random(42),
    swe,
    ds,
    type: (name: string) => types.find((t) => t.name === name)!.id,
    leaves,
    sweLeaves: leaves.filter((t) => t.trackId === swe.id),
    dsLeaves: leaves.filter((t) => t.trackId === ds.id),
    dsaLeaves: leaves.filter((t) => t.parent?.name === "Data Structures & Algorithms"),
  };
}

async function seedTopicStatuses(prisma: PrismaClient, ctx: Ctx) {
  const weights: [TopicStatus, number][] = [
    ["CONFIDENT", 0.3],
    ["REVISING", 0.25],
    ["LEARNING", 0.25],
    ["NOT_STARTED", 0.2],
  ];
  const byStatus = new Map<TopicStatus, string[]>();
  for (const topic of ctx.leaves) {
    let r = ctx.rand();
    const status = weights.find(([, w]) => (r -= w) < 0)?.[0] ?? "NOT_STARTED";
    byStatus.set(status, [...(byStatus.get(status) ?? []), topic.id]);
  }
  for (const [status, ids] of byStatus) {
    await prisma.topic.updateMany({ where: { id: { in: ids } }, data: { status } });
  }
}

async function seedTime(prisma: PrismaClient, ctx: Ctx, today: string) {
  const now = ctx.now.getTime();
  const data: Prisma.TimeEntryCreateManyInput[] = [];
  const add = (
    key: string,
    from: number,
    to: number,
    activity: string,
    extra: Partial<Prisma.TimeEntryCreateManyInput> = {},
  ) => {
    const startedAt = ctx.at(key, from);
    const endedAt = ctx.at(key, to);
    // Leave room before "now" for the running timer.
    if (endedAt.getTime() > now - 50 * MIN) return;
    data.push({
      userId: ctx.userId,
      activityTypeId: ctx.type(activity),
      startedAt,
      endedAt,
      ...extra,
    });
  };
  const study = (key: string, from: number, to: number, ds = false) => {
    add(key, from, to, "Study", {
      trackId: (ds ? ctx.ds : ctx.swe).id,
      topicId: ctx.pickOne(ds ? ctx.dsLeaves : ctx.sweLeaves).id,
      focusRating: ctx.between(3, 5),
    });
  };

  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const key = shiftDateKey(today, -i);
    const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
    const ramp = 1 - i / (HISTORY_DAYS * 1.6); // study a little more as the weeks go on
    const rest = weekday === 5 && ctx.chance(0.5);

    const bed = -ctx.between(20, 75); // previous evening, 22:45–23:40
    const wake = ctx.between(390, 450); // 06:30–07:30
    add(key, bed, wake, "Sleep");
    add(key, wake + 10, wake + 40, "Prayer");
    add(key, wake + 45, wake + 75, "Meal");

    if (!rest && ctx.chance(0.9 * ramp + 0.1)) study(key, 540, 540 + ctx.between(90, 150));
    add(key, 705, 720, "Break / Gap");
    if (weekday !== 5) add(key, 720, 780, "Work / Job");
    add(key, 785, 825, "Meal");
    if (!rest && ctx.chance(0.8 * ramp + 0.1)) {
      study(key, 840, 840 + ctx.between(60, 120), ctx.chance(0.35));
    }
    if (ctx.chance(0.25)) add(key, 990, 1030, "Social / Phone");
    if (ctx.chance(0.6)) add(key, 1080, 1080 + ctx.between(30, 50), "Exercise");
    add(key, 1150, 1190, "Meal");
    if (!rest && ctx.chance(0.7 * ramp)) study(key, 1230, 1230 + ctx.between(45, 90));
    if (ctx.chance(0.3)) {
      add(key, 1330, 1360, "Practice / Mock", {
        trackId: ctx.swe.id,
        focusRating: ctx.between(3, 5),
      });
    }
  }
  // A timer running right now, so the dashboard and header show it.
  data.push({
    userId: ctx.userId,
    activityTypeId: ctx.type("Study"),
    trackId: ctx.swe.id,
    topicId: ctx.dsaLeaves[0]?.id,
    startedAt: new Date(now - 47 * MIN),
    endedAt: null,
  });
  await prisma.timeEntry.createMany({ data });
}

async function seedJournal(prisma: PrismaClient, ctx: Ctx, today: string) {
  const plans = [
    "Two graph problems, then finish the caching chapter.",
    "Mock system design in the evening; review yesterday's notes.",
    "A/B testing chapter + one DP problem.",
    "Revise SQL indexing, apply to two roles.",
  ];
  const wins = [
    "Solved a hard DP problem without hints.",
    "Mock interview went well, clear explanation of trade-offs.",
    "Finally understood consistent hashing.",
    "Shipped the README for my portfolio project.",
  ];
  const logs: Prisma.DailyLogCreateManyInput[] = [];
  for (let i = 20; i >= 0; i--) {
    const key = shiftDateKey(today, -i);
    logs.push({
      userId: ctx.userId,
      date: dateKeyToDb(key),
      mood: ctx.between(3, 5),
      energy: ctx.between(2, 5),
      sleepQuality: ctx.between(3, 5),
      bedAt: ctx.at(key, -ctx.between(20, 70)),
      wakeAt: ctx.at(key, ctx.between(390, 440)),
      planForDay: ctx.pickOne(plans),
      wins: ctx.pickOne(wins),
    });
  }
  await prisma.dailyLog.createMany({ data: logs });

  const notes: [string, string, string[]][] = [
    [
      "Consistent hashing",
      "Keys and nodes on a ring; adding a node moves only ~1/n of the keys. **Virtual nodes** smooth out the load.",
      ["system-design", "distributed"],
    ],
    [
      "Monotonic stack",
      "Keep indices in increasing/decreasing order to find the next greater element in O(n).",
      ["dsa", "stack"],
    ],
    [
      "React Server Components",
      "Render on the server, ship no JS for them; client components are the interactive leaves.",
      ["react", "frontend"],
    ],
    [
      "Postgres isolation levels",
      "Read committed by default; repeatable read avoids non-repeatable reads; serializable can abort.",
      ["sql", "databases"],
    ],
    [
      "Dijkstra with a heap",
      "O((V + E) log V). Skip stale heap entries instead of decrease-key.",
      ["dsa", "graphs"],
    ],
    [
      "STAR answers",
      "Situation, Task, Action, Result. Keep the result measurable.",
      ["behavioral"],
    ],
    [
      "Bloom filters",
      "No false negatives; false-positive rate depends on bits per key and hash count.",
      ["system-design"],
    ],
    [
      "Topological sort",
      "Kahn's algorithm with in-degrees; a leftover node means a cycle.",
      ["dsa", "graphs"],
    ],
    [
      "Precision vs recall",
      "Precision: how many flagged are right. Recall: how many right ones were flagged. F1 balances them.",
      ["ml"],
    ],
    [
      "HTTP caching",
      "`Cache-Control`, `ETag` and `stale-while-revalidate`; never cache personalised responses publicly.",
      ["backend", "web"],
    ],
  ];
  const tagNames = [...new Set(notes.flatMap(([, , tags]) => tags))];
  await prisma.tag.createMany({ data: tagNames.map((name) => ({ userId: ctx.userId, name })) });
  const tags = await prisma.tag.findMany({ where: { userId: ctx.userId } });
  const tagId = (name: string) => tags.find((t) => t.name === name)!.id;

  for (const [n, [title, content, noteTags]] of notes.entries()) {
    const learnedOn = n >= 8 ? today : shiftDateKey(today, -(n * 3 + 1));
    const due = n < 3; // a few due today
    await prisma.learningEntry.create({
      data: {
        userId: ctx.userId,
        date: dateKeyToDb(learnedOn),
        trackId: noteTags.includes("ml") ? ctx.ds.id : ctx.swe.id,
        title,
        contentMd: content,
        confidence: ctx.between(2, 5),
        reviewStage: due ? n : ctx.between(1, 3),
        revisitOn: dateKeyToDb(due ? today : shiftDateKey(today, ctx.between(2, 12))),
        tags: { create: noteTags.map((name) => ({ tagId: tagId(name) })) },
      },
    });
  }
}

async function seedProblems(prisma: PrismaClient, ctx: Ctx, today: string) {
  const problems: [string, ProblemDifficulty][] = [
    ["Two Sum", "EASY"],
    ["Longest Substring Without Repeating Characters", "MEDIUM"],
    ["Merge Intervals", "MEDIUM"],
    ["Trapping Rain Water", "HARD"],
    ["Course Schedule", "MEDIUM"],
    ["Number of Islands", "MEDIUM"],
    ["LRU Cache", "MEDIUM"],
    ["Median of Two Sorted Arrays", "HARD"],
    ["Valid Parentheses", "EASY"],
    ["Coin Change", "MEDIUM"],
    ["Word Ladder", "HARD"],
    ["Kth Largest Element in an Array", "MEDIUM"],
    ["Daily Temperatures", "MEDIUM"],
    ["Binary Tree Level Order Traversal", "MEDIUM"],
    ["Edit Distance", "MEDIUM"],
    ["Network Delay Time", "MEDIUM"],
    ["Climbing Stairs", "EASY"],
    ["Serialize and Deserialize Binary Tree", "HARD"],
    ["Top K Frequent Elements", "MEDIUM"],
    ["Minimum Window Substring", "HARD"],
    ["Search in Rotated Sorted Array", "MEDIUM"],
    ["Longest Increasing Subsequence", "MEDIUM"],
  ];
  const statuses: ProblemStatus[] = ["SOLVED", "SOLVED", "SOLVED", "NEEDS_REVISION", "ATTEMPTED"];
  const data = problems.map(([title, difficulty], n): Prisma.ProblemCreateManyInput => {
    const status: ProblemStatus = n >= problems.length - 3 ? "TODO" : ctx.pickOne(statuses);
    const solved = status === "SOLVED" || status === "NEEDS_REVISION";
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return {
      userId: ctx.userId,
      topicId: ctx.pickOne(ctx.dsaLeaves).id,
      title,
      platform: "LEETCODE",
      url: `https://leetcode.com/problems/${slug}/`,
      difficulty,
      status,
      attempts: status === "TODO" ? 0 : ctx.between(1, 4),
      timeSpentMin: status === "TODO" ? 0 : ctx.between(15, 90),
      solvedAt: solved ? ctx.at(shiftDateKey(today, -ctx.between(1, 60)), 600) : null,
      nextReviewOn: solved
        ? dateKeyToDb(n % 4 === 0 ? today : shiftDateKey(today, ctx.between(1, 14)))
        : null,
      reviewStage: solved ? ctx.between(0, 3) : 0,
    };
  });
  await prisma.problem.createMany({ data });
}

async function seedPractice(prisma: PrismaClient, ctx: Ctx, today: string) {
  const questions: [string, boolean][] = [
    ["Tell me about a time you disagreed with a teammate.", false],
    ["How would you design a URL shortener?", false],
    ["Explain the event loop in Node.js.", false],
    ["How would you detect and handle data leakage in a model?", true],
    ["Design an A/B test for a new checkout button.", true],
    ["What happens when you type a URL into the browser?", false],
  ];
  await prisma.practiceQuestion.createMany({
    data: questions.map(([question, ds], n) => ({
      userId: ctx.userId,
      trackId: ds ? ctx.ds.id : ctx.swe.id,
      question,
      answerMd: "Draft answer: structure it, give one concrete example, close with the result.",
      reviewStage: ctx.between(0, 3),
      nextReviewOn: dateKeyToDb(n < 2 ? today : shiftDateKey(today, ctx.between(1, 10))),
    })),
  });

  const talks = [
    "Portfolio walkthrough: Expense Tracker",
    "Intro to Graph Algorithms",
    "Churn prediction model: results",
    "Database Normalization",
    "Tech talk: Code Review Practices",
    "A/B test readout: onboarding flow",
    "System design: URL shortener",
    "Capstone demo: recommendation engine",
  ];
  await prisma.presentation.createMany({
    data: talks.map((title, n) => ({
      userId: ctx.userId,
      trackId: n % 2 === 0 ? ctx.swe.id : ctx.ds.id,
      title,
      date: dateKeyToDb(shiftDateKey(today, -(talks.length - n) * 8)),
      durationMin: ctx.between(15, 30),
      audience: ctx.pickOne(["SELF", "RECORDED", "MOCK_PANEL"] as const),
      selfScore: Math.min(5, 2 + Math.floor(n / 2.5) + (ctx.chance(0.3) ? 1 : 0)),
    })),
  });

  const mocks: [InterviewRound, number][] = [
    ["TECHNICAL", 3],
    ["SYSTEM_DESIGN", 3],
    ["BEHAVIORAL", 4],
    ["TECHNICAL", 4],
    ["SCREENING", 4],
  ];
  await prisma.mockInterview.createMany({
    data: mocks.map(([type, score], n) => ({
      userId: ctx.userId,
      trackId: type === "SCREENING" ? ctx.ds.id : ctx.swe.id,
      date: dateKeyToDb(shiftDateKey(today, -(mocks.length - n) * 10)),
      partner: ctx.pickOne(["Peer", "Mentor", "Study group"]),
      type,
      score,
      feedbackMd: "Communicate the approach before coding; watch the time on the last part.",
    })),
  });
}

const PIPELINE: ApplicationStatus[] = ["WISHLIST", "APPLIED", "OA", "INTERVIEWING", "OFFER"];

async function seedJobs(prisma: PrismaClient, ctx: Ctx, today: string) {
  // Fictional organizations only.
  const apps: [string, string, ApplicationStatus, number, "swe" | "ds"][] = [
    ["Northwind Labs", "Software Engineer, Backend", "OFFER", 48, "swe"],
    ["Brightpath", "Full-Stack Engineer", "INTERVIEWING", 30, "swe"],
    ["Lumen Analytics", "Data Scientist", "INTERVIEWING", 21, "ds"],
    ["Cobalt Systems", "Software Engineer II", "OA", 12, "swe"],
    ["Pixelforge", "React Developer", "APPLIED", 6, "swe"],
    ["Riverstone Bank", "Platform Engineer", "APPLIED", 3, "swe"],
    ["Orbital Health", "Full-Stack Developer", "REJECTED", 40, "swe"],
    ["Quanta Software", "Backend Engineer (Node.js)", "REJECTED", 35, "swe"],
    ["Eastbridge Insights", "Machine Learning Engineer", "INTERVIEWING", 25, "ds"],
    ["Green Valley Retail", "Data Analyst", "APPLIED", 9, "ds"],
    ["Harbor AI", "Software Engineer", "WISHLIST", 0, "swe"],
    ["Summit Cloud", "Site Reliability Engineer", "WISHLIST", 0, "swe"],
  ];
  const userId = ctx.userId;
  for (const [name, role, status, appliedDaysAgo, track] of apps) {
    // Status history: walk the pipeline up to the current (or last reached) stage.
    const reached = status === "REJECTED" ? "INTERVIEWING" : status;
    const path = PIPELINE.slice(0, PIPELINE.indexOf(reached) + 1);
    if (status === "REJECTED") path.push("REJECTED");
    const events = path.map((to, i) => {
      const dayOffset = to === "WISHLIST" ? -appliedDaysAgo - 3 : -appliedDaysAgo + i * 5;
      return {
        userId,
        fromStatus: i === 0 ? null : path[i - 1]!,
        toStatus: to,
        at: ctx.at(shiftDateKey(today, Math.min(0, dayOffset)), 660),
      };
    });

    // Interviews: past rounds with results, plus an upcoming one for open applications.
    const rounds: InterviewRound[] =
      track === "ds"
        ? ["SCREENING", "TECHNICAL", "BEHAVIORAL"]
        : ["OA", "TECHNICAL", "SYSTEM_DESIGN", "HR"];
    const count = { OFFER: 4, INTERVIEWING: 3, REJECTED: 2, OA: 1 }[status as string] ?? 0;
    const interviews = rounds.slice(0, count).map((round, r) => {
      const last = r === count - 1;
      const upcoming = last && (status === "INTERVIEWING" || status === "OA");
      const dayOffset = upcoming ? ctx.between(1, 12) : Math.min(-1, -appliedDaysAgo + 4 + r * 6);
      return {
        userId,
        round,
        scheduledAt: ctx.at(shiftDateKey(today, dayOffset), ctx.between(10, 16) * 60),
        durationMin: 60,
        interviewer: upcoming ? null : ctx.pickOne(["Hiring manager", "Senior engineer", "Panel"]),
        outcome: upcoming
          ? ("PENDING" as const)
          : status === "REJECTED" && last
            ? ("FAILED" as const)
            : ("PASSED" as const),
        selfRating: upcoming ? null : ctx.between(3, 5),
      };
    });

    await prisma.organization.create({
      data: {
        userId,
        name,
        type: "COMPANY",
        location: ctx.pickOne(["Dhaka", "Remote", "Singapore", "Berlin"]),
        applications: {
          create: {
            userId,
            trackId: track === "ds" ? ctx.ds.id : ctx.swe.id,
            role,
            source: ctx.pickOne(["LinkedIn", "Referral", "Company site", "Job board"]),
            status,
            appliedOn:
              status === "WISHLIST" ? null : dateKeyToDb(shiftDateKey(today, -appliedDaysAgo)),
            deadlineOn:
              status === "WISHLIST" ? dateKeyToDb(shiftDateKey(today, ctx.between(5, 20))) : null,
            salaryRange: ctx.pickOne(["$60k–80k", "$70k–90k", "$80k–100k"]),
            events: { create: events },
            interviews: { create: interviews },
          },
        },
      },
    });
  }
}

async function seedResources(prisma: PrismaClient, ctx: Ctx, today: string) {
  const items: (Omit<
    Prisma.ResourceCreateManyInput,
    "userId" | "startedOn" | "finishedOn" | "rating"
  > & { status: "PLANNED" | "IN_PROGRESS" | "DONE" })[] = [
    {
      title: "Designing Data-Intensive Applications",
      author: "Martin Kleppmann",
      type: "BOOK",
      unitLabel: "chapters",
      totalUnits: 12,
      completedUnits: 8,
      status: "IN_PROGRESS",
    },
    {
      title: "System Design Interview course",
      type: "COURSE",
      unitLabel: "lessons",
      totalUnits: 40,
      completedUnits: 40,
      status: "DONE",
    },
    {
      title: "Top 150 interview problems",
      type: "SHEET",
      unitLabel: "problems",
      totalUnits: 150,
      completedUnits: 87,
      status: "IN_PROGRESS",
    },
    {
      title: "Hands-On Machine Learning",
      author: "Aurélien Géron",
      type: "BOOK",
      unitLabel: "chapters",
      totalUnits: 19,
      completedUnits: 5,
      status: "IN_PROGRESS",
      trackId: ctx.ds.id,
    },
    {
      title: "Database Internals",
      author: "Alex Petrov",
      type: "BOOK",
      unitLabel: "chapters",
      totalUnits: 14,
      completedUnits: 0,
      status: "PLANNED",
    },
  ];
  await prisma.resource.createMany({
    data: items.map((r) => ({
      userId: ctx.userId,
      trackId: ctx.swe.id,
      ...r,
      startedOn:
        r.status === "PLANNED" ? null : dateKeyToDb(shiftDateKey(today, -ctx.between(20, 70))),
      finishedOn:
        r.status === "DONE" ? dateKeyToDb(shiftDateKey(today, -ctx.between(1, 10))) : null,
      rating: r.status === "DONE" ? 5 : null,
    })),
  });
}

function mondayOf(key: string): string {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return shiftDateKey(key, -((weekday + 6) % 7));
}

async function seedChecklists(prisma: PrismaClient, ctx: Ctx, today: string) {
  const userId = ctx.userId;
  const habitItems = (titles: string[]) => ({
    create: titles.map((title, sortOrder) => ({ userId, title, sortOrder })),
  });
  const daily = await prisma.checklist.create({
    data: {
      userId,
      trackId: ctx.swe.id,
      title: "Daily habits",
      type: "HABIT",
      recurrence: "DAILY",
      items: habitItems(["Solve 2 problems", "Review due notes", "Exercise 30 min"]),
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  const weekly = await prisma.checklist.create({
    data: {
      userId,
      title: "Weekly",
      type: "HABIT",
      recurrence: "WEEKLY",
      items: habitItems(["One mock interview", "Apply to 3 roles"]),
    },
    include: { items: true },
  });

  const completions: Prisma.ChecklistItemCompletionCreateManyInput[] = [];
  const tick = (itemId: string, key: string) =>
    completions.push({ itemId, userId, period: dateKeyToDb(key) });
  for (const [n, item] of daily.items.entries()) {
    const streak = [12, 7, 4][n] ?? 0;
    for (let i = 1; i <= 28; i++) {
      if (i > streak && ctx.chance(0.4)) continue;
      tick(item.id, shiftDateKey(today, -i));
    }
    if (n === 0) tick(item.id, today);
  }
  for (const item of weekly.items) {
    for (let w = 1; w <= 6; w++) tick(item.id, mondayOf(shiftDateKey(today, -7 * w)));
  }
  await prisma.checklistItemCompletion.createMany({ data: completions });

  await prisma.checklist.create({
    data: {
      userId,
      trackId: ctx.swe.id,
      title: "Before the Brightpath onsite",
      type: "ONE_OFF",
      items: {
        create: [
          "Re-read the job description",
          "Prepare 3 STAR stories",
          "Review the system design notes",
          "Practice a 2-minute intro",
          "Prepare questions for the team",
        ].map((title, i) => ({
          userId,
          title,
          sortOrder: i,
          priority: i < 2 ? 2 : 1,
          dueOn: dateKeyToDb(shiftDateKey(today, 3)),
          doneAt: i < 3 ? ctx.at(shiftDateKey(today, -i - 1), 700) : null,
        })),
      },
    },
  });
}

async function seedProjects(prisma: PrismaClient, ctx: Ctx) {
  await prisma.project.createMany({
    data: [
      {
        userId: ctx.userId,
        name: "Interview tracker",
        description: "Tracks study time, learning, practice and the job hunt.",
        stack: ["Next.js", "PostgreSQL", "Prisma", "TypeScript"],
        status: "SHIPPED",
        sortOrder: 0,
      },
      {
        userId: ctx.userId,
        name: "Realtime chat",
        description: "WebSocket chat with rooms, presence and message history.",
        stack: ["Node.js", "Redis", "React"],
        status: "BUILDING",
        sortOrder: 1,
      },
      {
        userId: ctx.userId,
        name: "Churn predictor",
        description: "Predicts subscription churn from usage data, with an explainability report.",
        stack: ["Python", "scikit-learn", "pandas"],
        status: "PLANNING",
        sortOrder: 2,
      },
    ],
  });
}

async function seedGoals(prisma: PrismaClient, ctx: Ctx, today: string) {
  const userId = ctx.userId;
  const startsOn = dateKeyToDb(shiftDateKey(today, -HISTORY_DAYS));
  await prisma.goal.createMany({
    data: [
      { userId, metric: "STUDY_MINUTES", period: "DAY", target: 240, startsOn },
      {
        userId,
        trackId: ctx.swe.id,
        metric: "STUDY_MINUTES",
        period: "WEEK",
        target: 1200,
        startsOn,
      },
      { userId, metric: "PROBLEMS_SOLVED", period: "WEEK", target: 2, startsOn },
      { userId, metric: "LEARNING_ENTRIES", period: "WEEK", target: 1, startsOn },
    ],
  });
}
