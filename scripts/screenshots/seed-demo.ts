/**
 * Fills a demo account with ~3 months of realistic, made-up data for the README screenshots.
 * Run by the screenshots Playwright global setup (via tsx). Expects DATABASE_URL = test DB.
 * Idempotent: the demo user is deleted (everything cascades) and recreated on every run.
 * Dates are relative to "now", so the screenshots always look current.
 */
import { createScriptClient } from "../../prisma/client";
import { seedDefaultsForUser } from "../../prisma/seed-defaults";
import type {
  ApplicationStatus,
  InterviewRound,
  Prisma,
  ProblemDifficulty,
  ProblemStatus,
  TopicStatus,
} from "../../src/generated/prisma/client";
import { dateKeyToDb, logicalDateKey, parseLocalDateTime, shiftDateKey } from "../../src/lib/dates";
import { hashPassword } from "../../src/modules/auth/password";

import { DEMO_USER } from "./demo-user";

const TZ = "Asia/Dhaka";
const DAY_START = 4;
const HISTORY_DAYS = 90;
const MIN = 60_000;

type Db = ReturnType<typeof createScriptClient>;

/** Small deterministic PRNG so every run produces the same-looking data. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(42);
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const chance = (p: number) => rand() < p;
const pickOne = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;

/** A local wall-clock time on a date key (minutes after midnight, may exceed 24h). */
function at(key: string, minutes: number): Date {
  const day = shiftDateKey(key, Math.floor(minutes / 1440));
  const m = ((minutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  const d = parseLocalDateTime(`${day}T${hh}:${mm}`, TZ);
  if (!d) throw new Error(`bad time ${day} ${minutes}`);
  return d;
}

async function main() {
  const prisma = createScriptClient();
  try {
    await prisma.user.deleteMany({ where: { email: DEMO_USER.email } });
    const user = await prisma.user.create({
      data: {
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        timezone: TZ,
        dayStartHour: DAY_START,
        passwordHash: await hashPassword(DEMO_USER.password),
      },
    });
    await seedDefaultsForUser(prisma, user.id, { starterTracks: true });
    const today = logicalDateKey(new Date(), TZ, DAY_START);
    const ctx = await loadContext(prisma, user.id);

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
  } finally {
    await prisma.$disconnect();
  }
}

type Ctx = Awaited<ReturnType<typeof loadContext>>;

async function loadContext(prisma: Db, userId: string) {
  const tracks = await prisma.track.findMany({ where: { userId } });
  const swe = tracks.find((t) => t.name === "SWE / Full-Stack")!;
  const lecturer = tracks.find((t) => t.name === "University Lecturer")!;
  const types = await prisma.activityType.findMany({ where: { userId } });
  const type = (name: string) => types.find((t) => t.name === name)!.id;
  const topics = await prisma.topic.findMany({
    where: { userId },
    include: { children: { select: { id: true } }, parent: { select: { name: true } } },
    orderBy: { sortOrder: "asc" },
  });
  const leaves = topics.filter((t) => t.children.length === 0);
  return {
    userId,
    swe,
    lecturer,
    type,
    leaves,
    sweLeaves: leaves.filter((t) => t.trackId === swe.id),
    lecturerLeaves: leaves.filter((t) => t.trackId === lecturer.id),
    dsaLeaves: leaves.filter((t) => t.parent?.name === "Data Structures & Algorithms"),
  };
}

async function seedTopicStatuses(prisma: Db, ctx: Ctx) {
  const weights: [TopicStatus, number][] = [
    ["CONFIDENT", 0.3],
    ["REVISING", 0.25],
    ["LEARNING", 0.25],
    ["NOT_STARTED", 0.2],
  ];
  for (const topic of ctx.leaves) {
    let r = rand();
    const status = weights.find(([, w]) => (r -= w) < 0)?.[0] ?? "NOT_STARTED";
    await prisma.topic.update({ where: { id: topic.id }, data: { status } });
  }
}

async function seedTime(prisma: Db, ctx: Ctx, today: string) {
  const now = Date.now();
  const data: Prisma.TimeEntryCreateManyInput[] = [];
  const add = (
    key: string,
    from: number,
    to: number,
    activity: string,
    extra: Partial<Prisma.TimeEntryCreateManyInput> = {},
  ) => {
    const startedAt = at(key, from);
    const endedAt = at(key, to);
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
  const study = (key: string, from: number, to: number, lecturer = false) => {
    const track = lecturer ? ctx.lecturer : ctx.swe;
    const topic = pickOne(lecturer ? ctx.lecturerLeaves : ctx.sweLeaves);
    add(key, from, to, "Study", {
      trackId: track.id,
      topicId: topic.id,
      focusRating: between(3, 5),
    });
  };

  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const key = shiftDateKey(today, -i);
    const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
    const ramp = 1 - i / (HISTORY_DAYS * 1.6); // study a little more as the weeks go on
    const rest = weekday === 5 && chance(0.5);

    const bed = -between(20, 75); // previous evening, 22:45–23:40
    const wake = between(390, 450); // 06:30–07:30
    add(key, bed, wake, "Sleep");
    add(key, wake + 10, wake + 40, "Prayer");
    add(key, wake + 45, wake + 75, "Meal");

    if (!rest && chance(0.9 * ramp + 0.1)) study(key, 540, 540 + between(90, 150));
    add(key, 705, 720, "Break / Gap");
    if (weekday !== 5) add(key, 720, 780, "Work / Job");
    add(key, 785, 825, "Meal");
    if (!rest && chance(0.8 * ramp + 0.1)) study(key, 840, 840 + between(60, 120), chance(0.35));
    if (chance(0.25)) add(key, 990, 1030, "Social / Phone");
    if (chance(0.6)) add(key, 1080, 1080 + between(30, 50), "Exercise");
    add(key, 1150, 1190, "Meal");
    if (!rest && chance(0.7 * ramp)) study(key, 1230, 1230 + between(45, 90));
    if (chance(0.3)) {
      add(key, 1330, 1360, "Practice / Mock", { trackId: ctx.swe.id, focusRating: between(3, 5) });
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

async function seedJournal(prisma: Db, ctx: Ctx, today: string) {
  const plans = [
    "Two graph problems, then finish the caching chapter.",
    "Mock system design in the evening; review yesterday's notes.",
    "Teaching demo rehearsal + one DP problem.",
    "Revise SQL indexing, apply to two roles.",
  ];
  const wins = [
    "Solved a hard DP problem without hints.",
    "Mock interview went well, clear explanation of trade-offs.",
    "Finally understood consistent hashing.",
    "Shipped the README for my portfolio project.",
  ];
  for (let i = 20; i >= 0; i--) {
    const key = shiftDateKey(today, -i);
    await prisma.dailyLog.create({
      data: {
        userId: ctx.userId,
        date: dateKeyToDb(key),
        mood: between(3, 5),
        energy: between(2, 5),
        sleepQuality: between(3, 5),
        bedAt: at(key, -between(20, 70)),
        wakeAt: at(key, between(390, 440)),
        planForDay: pickOne(plans),
        wins: pickOne(wins),
      },
    });
  }

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
      "Constructive alignment",
      "Learning outcomes, activities and assessment should all point at the same goal.",
      ["teaching"],
    ],
    [
      "HTTP caching",
      "`Cache-Control`, `ETag` and `stale-while-revalidate`; never cache personalised responses publicly.",
      ["backend", "web"],
    ],
  ];
  const tagIds = new Map<string, string>();
  for (const [n, [title, content, tags]] of notes.entries()) {
    const learnedOn = n >= 8 ? today : shiftDateKey(today, -(n * 3 + 1));
    const due = n < 3; // a few due today
    const entry = await prisma.learningEntry.create({
      data: {
        userId: ctx.userId,
        date: dateKeyToDb(learnedOn),
        trackId: tags.includes("teaching") ? ctx.lecturer.id : ctx.swe.id,
        title,
        contentMd: content,
        confidence: between(2, 5),
        reviewStage: due ? n : between(1, 3),
        revisitOn: dateKeyToDb(due ? today : shiftDateKey(today, between(2, 12))),
      },
    });
    for (const tag of tags) {
      let tagId = tagIds.get(tag);
      if (!tagId) {
        tagId = (await prisma.tag.create({ data: { userId: ctx.userId, name: tag } })).id;
        tagIds.set(tag, tagId);
      }
      await prisma.learningEntryTag.create({ data: { learningEntryId: entry.id, tagId } });
    }
  }
}

async function seedProblems(prisma: Db, ctx: Ctx, today: string) {
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
  for (const [n, [title, difficulty]] of problems.entries()) {
    const status: ProblemStatus = n >= problems.length - 3 ? "TODO" : pickOne(statuses);
    const solved = status === "SOLVED" || status === "NEEDS_REVISION";
    const daysAgo = between(0, 60);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await prisma.problem.create({
      data: {
        userId: ctx.userId,
        topicId: pickOne(ctx.dsaLeaves).id,
        title,
        platform: "LEETCODE",
        url: `https://leetcode.com/problems/${slug}/`,
        difficulty,
        status,
        attempts: status === "TODO" ? 0 : between(1, 4),
        timeSpentMin: status === "TODO" ? 0 : between(15, 90),
        solvedAt: solved ? at(shiftDateKey(today, -daysAgo), 600) : null,
        nextReviewOn: solved
          ? dateKeyToDb(n % 4 === 0 ? today : shiftDateKey(today, between(1, 14)))
          : null,
        reviewStage: solved ? between(0, 3) : 0,
      },
    });
  }
}

async function seedPractice(prisma: Db, ctx: Ctx, today: string) {
  const questions: [string, boolean][] = [
    ["Tell me about a time you disagreed with a teammate.", false],
    ["How would you design a URL shortener?", false],
    ["Explain the event loop in Node.js.", false],
    ["Why do you want to teach at this university?", true],
    ["How do you assess whether students met the learning outcomes?", true],
    ["What happens when you type a URL into the browser?", false],
  ];
  for (const [n, [question, lecturer]] of questions.entries()) {
    await prisma.practiceQuestion.create({
      data: {
        userId: ctx.userId,
        trackId: lecturer ? ctx.lecturer.id : ctx.swe.id,
        question,
        answerMd: "Draft answer: structure it, give one concrete example, close with the result.",
        reviewStage: between(0, 3),
        nextReviewOn: dateKeyToDb(n < 2 ? today : shiftDateKey(today, between(1, 10))),
      },
    });
  }
  const talks = [
    "Intro to Graph Algorithms",
    "Teaching Demo: Recursion",
    "Database Normalization",
    "Research talk: Code Review Practices",
    "Teaching Demo: Big-O Notation",
    "Operating Systems: Scheduling",
    "Teaching Demo: Hash Tables",
    "Intro to Networking",
  ];
  for (const [n, title] of talks.entries()) {
    await prisma.presentation.create({
      data: {
        userId: ctx.userId,
        trackId: ctx.lecturer.id,
        title,
        date: dateKeyToDb(shiftDateKey(today, -(talks.length - n) * 8)),
        durationMin: between(15, 30),
        audience: pickOne(["SELF", "RECORDED", "MOCK_PANEL"] as const),
        selfScore: Math.min(5, 2 + Math.floor(n / 2.5) + (chance(0.3) ? 1 : 0)),
      },
    });
  }
  const mocks: [InterviewRound, number][] = [
    ["TECHNICAL", 3],
    ["SYSTEM_DESIGN", 3],
    ["BEHAVIORAL", 4],
    ["TECHNICAL", 4],
    ["TEACHING_DEMO", 4],
  ];
  for (const [n, [type, score]] of mocks.entries()) {
    await prisma.mockInterview.create({
      data: {
        userId: ctx.userId,
        trackId: type === "TEACHING_DEMO" ? ctx.lecturer.id : ctx.swe.id,
        date: dateKeyToDb(shiftDateKey(today, -(mocks.length - n) * 10)),
        partner: pickOne(["Peer", "Mentor", "Pramp"]),
        type,
        score,
        feedbackMd: "Communicate the approach before coding; watch the time on the last part.",
      },
    });
  }
}

const PIPELINE: ApplicationStatus[] = ["WISHLIST", "APPLIED", "OA", "INTERVIEWING", "OFFER"];

async function seedJobs(prisma: Db, ctx: Ctx, today: string) {
  // Fictional organizations only.
  const apps: [string, "COMPANY" | "UNIVERSITY", string, ApplicationStatus, number][] = [
    ["Northwind Labs", "COMPANY", "Software Engineer, Backend", "OFFER", 48],
    ["Brightpath", "COMPANY", "Full-Stack Engineer", "INTERVIEWING", 30],
    ["Lumen Analytics", "COMPANY", "Frontend Engineer", "INTERVIEWING", 21],
    ["Cobalt Systems", "COMPANY", "Software Engineer II", "OA", 12],
    ["Pixelforge", "COMPANY", "React Developer", "APPLIED", 6],
    ["Riverstone Bank", "COMPANY", "Platform Engineer", "APPLIED", 3],
    ["Orbital Health", "COMPANY", "Full-Stack Developer", "REJECTED", 40],
    ["Quanta Software", "COMPANY", "Backend Engineer (Node.js)", "REJECTED", 35],
    ["Eastbridge University", "UNIVERSITY", "Lecturer, Computer Science", "INTERVIEWING", 25],
    ["Green Valley University", "UNIVERSITY", "Lecturer, CSE", "APPLIED", 9],
    ["Harbor AI", "COMPANY", "Software Engineer", "WISHLIST", 0],
    ["Summit Cloud", "COMPANY", "Site Reliability Engineer", "WISHLIST", 0],
  ];
  for (const [name, type, role, status, appliedDaysAgo] of apps) {
    const org = await prisma.organization.create({
      data: {
        userId: ctx.userId,
        name,
        type,
        location: pickOne(["Dhaka", "Remote", "Singapore", "Berlin"]),
      },
    });
    const appliedKey = shiftDateKey(today, -appliedDaysAgo);
    const app = await prisma.application.create({
      data: {
        userId: ctx.userId,
        organizationId: org.id,
        trackId: type === "UNIVERSITY" ? ctx.lecturer.id : ctx.swe.id,
        role,
        source: pickOne(["LinkedIn", "Referral", "Company site", "Job board"]),
        status,
        appliedOn: status === "WISHLIST" ? null : dateKeyToDb(appliedKey),
        deadlineOn: status === "WISHLIST" ? dateKeyToDb(shiftDateKey(today, between(5, 20))) : null,
        salaryRange: type === "COMPANY" ? pickOne(["$60k–80k", "$70k–90k", "$80k–100k"]) : null,
      },
    });

    // Status history: walk the pipeline up to the current (or last reached) stage.
    const reached =
      status === "REJECTED" ? "INTERVIEWING" : status === "WITHDRAWN" ? "APPLIED" : status;
    const path = PIPELINE.slice(0, PIPELINE.indexOf(reached) + 1);
    if (status === "REJECTED") path.push("REJECTED");
    let from: ApplicationStatus | null = null;
    for (const [i, to] of path.entries()) {
      const dayOffset = to === "WISHLIST" ? -appliedDaysAgo - 3 : -appliedDaysAgo + i * 5;
      await prisma.applicationEvent.create({
        data: {
          userId: ctx.userId,
          applicationId: app.id,
          fromStatus: from,
          toStatus: to,
          at: at(shiftDateKey(today, Math.min(0, dayOffset)), 660),
        },
      });
      from = to;
    }

    // Interviews: past rounds with results, plus upcoming ones.
    const rounds: InterviewRound[] =
      type === "UNIVERSITY"
        ? ["WRITTEN", "TEACHING_DEMO", "VIVA"]
        : ["OA", "TECHNICAL", "SYSTEM_DESIGN", "HR"];
    const count =
      status === "OFFER"
        ? 4
        : status === "INTERVIEWING"
          ? 3
          : status === "REJECTED"
            ? 2
            : status === "OA"
              ? 1
              : 0;
    for (let r = 0; r < Math.min(count, rounds.length); r++) {
      const last = r === count - 1;
      const upcoming = last && (status === "INTERVIEWING" || status === "OA");
      const dayOffset = upcoming ? between(1, 12) : -appliedDaysAgo + 4 + r * 6;
      await prisma.interview.create({
        data: {
          userId: ctx.userId,
          applicationId: app.id,
          round: rounds[r]!,
          scheduledAt: at(
            shiftDateKey(today, Math.min(dayOffset, upcoming ? 30 : -1)),
            between(10, 16) * 60,
          ),
          durationMin: 60,
          interviewer: upcoming ? null : pickOne(["Hiring manager", "Senior engineer", "Panel"]),
          outcome: upcoming ? "PENDING" : status === "REJECTED" && last ? "FAILED" : "PASSED",
          selfRating: upcoming ? null : between(3, 5),
        },
      });
    }
  }
}

async function seedResources(prisma: Db, ctx: Ctx, today: string) {
  const items: Prisma.ResourceCreateManyInput[] = [
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
      title: "Grokking the System Design Interview",
      type: "COURSE",
      unitLabel: "lessons",
      totalUnits: 40,
      completedUnits: 40,
      status: "DONE",
    },
    {
      title: "NeetCode 150",
      type: "SHEET",
      unitLabel: "problems",
      totalUnits: 150,
      completedUnits: 87,
      status: "IN_PROGRESS",
    },
    {
      title: "Teaching at Its Best",
      author: "Linda B. Nilson",
      type: "BOOK",
      unitLabel: "chapters",
      totalUnits: 24,
      completedUnits: 5,
      status: "IN_PROGRESS",
      trackId: ctx.lecturer.id,
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
  ].map((r) => ({
    userId: ctx.userId,
    trackId: ctx.swe.id,
    ...r,
    startedOn: r.status === "PLANNED" ? null : dateKeyToDb(shiftDateKey(today, -between(20, 70))),
    finishedOn: r.status === "DONE" ? dateKeyToDb(shiftDateKey(today, -between(1, 10))) : null,
    rating: r.status === "DONE" ? 5 : null,
  })) as Prisma.ResourceCreateManyInput[];
  await prisma.resource.createMany({ data: items });
}

function mondayOf(key: string): string {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return shiftDateKey(key, -((weekday + 6) % 7));
}

async function seedChecklists(prisma: Db, ctx: Ctx, today: string) {
  const daily = await prisma.checklist.create({
    data: {
      userId: ctx.userId,
      trackId: ctx.swe.id,
      title: "Daily habits",
      type: "HABIT",
      recurrence: "DAILY",
      items: {
        create: ["Solve 2 problems", "Review due notes", "Exercise 30 min"].map((title, i) => ({
          userId: ctx.userId,
          title,
          sortOrder: i,
        })),
      },
    },
    include: { items: true },
  });
  for (const [n, item] of daily.items.entries()) {
    const streak = [12, 7, 4][n]!;
    for (let i = 1; i <= 28; i++) {
      if (i > streak && chance(0.4)) continue;
      await prisma.checklistItemCompletion.create({
        data: { itemId: item.id, userId: ctx.userId, period: dateKeyToDb(shiftDateKey(today, -i)) },
      });
    }
    if (n === 0) {
      await prisma.checklistItemCompletion.create({
        data: { itemId: item.id, userId: ctx.userId, period: dateKeyToDb(today) },
      });
    }
  }

  const weekly = await prisma.checklist.create({
    data: {
      userId: ctx.userId,
      title: "Weekly",
      type: "HABIT",
      recurrence: "WEEKLY",
      items: {
        create: ["One mock interview", "Apply to 3 roles"].map((title, i) => ({
          userId: ctx.userId,
          title,
          sortOrder: i,
        })),
      },
    },
    include: { items: true },
  });
  for (const item of weekly.items) {
    for (let w = 1; w <= 6; w++) {
      await prisma.checklistItemCompletion.create({
        data: {
          itemId: item.id,
          userId: ctx.userId,
          period: dateKeyToDb(mondayOf(shiftDateKey(today, -7 * w))),
        },
      });
    }
  }

  const done = (n: number) => (n < 3 ? at(shiftDateKey(today, -n - 1), 700) : null);
  await prisma.checklist.create({
    data: {
      userId: ctx.userId,
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
          userId: ctx.userId,
          title,
          sortOrder: i,
          priority: i < 2 ? 2 : 1,
          dueOn: dateKeyToDb(shiftDateKey(today, 3)),
          doneAt: done(i),
        })),
      },
    },
  });
}

async function seedProjects(prisma: Db, ctx: Ctx) {
  await prisma.project.createMany({
    data: [
      {
        userId: ctx.userId,
        name: "CrackIt",
        description: "Interview-prep tracker: time, learning, practice and the job hunt.",
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
        name: "Course scheduler",
        description: "Constraint-based timetable generator for a university department.",
        stack: ["Python", "OR-Tools"],
        status: "PLANNING",
        sortOrder: 2,
      },
    ],
  });
}

async function seedGoals(prisma: Db, ctx: Ctx, today: string) {
  const startsOn = dateKeyToDb(shiftDateKey(today, -HISTORY_DAYS));
  await prisma.goal.createMany({
    data: [
      { userId: ctx.userId, metric: "STUDY_MINUTES", period: "DAY", target: 240, startsOn },
      {
        userId: ctx.userId,
        trackId: ctx.swe.id,
        metric: "STUDY_MINUTES",
        period: "WEEK",
        target: 1200,
        startsOn,
      },
      { userId: ctx.userId, metric: "PROBLEMS_SOLVED", period: "WEEK", target: 2, startsOn },
      { userId: ctx.userId, metric: "LEARNING_ENTRIES", period: "WEEK", target: 1, startsOn },
    ],
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
