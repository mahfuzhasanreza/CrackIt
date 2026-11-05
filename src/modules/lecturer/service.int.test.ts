import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";

import {
  countDueViva,
  deleteRecord,
  getLecturerPage,
  practiseViva,
  saveCourse,
  saveDemo,
  savePublication,
  saveViva,
} from "./service";

let user: { id: string; timezone: string; dayStartHour: number };
const on = (key: string) => new Date(`${key}T04:00:00Z`); // 10:00 Dhaka
const TODAY = "2026-11-05";

beforeEach(async () => {
  user = { id: (await createTestUser()).user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };
});

async function course(name = "Data Structures") {
  expect((await saveCourse(user.id, { name, readiness: 2, notesMd: "" })).ok).toBe(true);
  return (await getLecturerPage(user, on(TODAY))).courses.find((c) => c.name === name)!;
}

describe("courses", () => {
  it("rejects duplicate names (case-insensitive) and averages readiness", async () => {
    await course("Data Structures");
    const dup = await saveCourse(user.id, { name: "data structures", readiness: 3, notesMd: "" });
    expect(!dup.ok && dup.error.fieldErrors?.name).toBeTruthy();
    await saveCourse(user.id, { name: "Operating Systems", readiness: 5, notesMd: "" });
    expect((await getLecturerPage(user, on(TODAY))).summary.averageReadiness).toBe(3.5);
  });
});

describe("teaching demos", () => {
  it("logs demos with a course, rejects future dates and computes the trend", async () => {
    const c = await course();
    for (const [date, score] of [
      ["2026-11-01", 2],
      ["2026-11-03", 4],
    ] as const) {
      const res = await saveDemo(
        user,
        {
          topic: "Stacks",
          courseId: c.id,
          date,
          durationMin: 15,
          audience: "RECORDED",
          selfScore: score,
          feedbackMd: "",
        },
        on(TODAY),
      );
      expect(res.ok).toBe(true);
    }
    const future = await saveDemo(
      user,
      { topic: "x", date: "2026-11-06", durationMin: 10, audience: "SELF", feedbackMd: "" },
      on(TODAY),
    );
    expect(!future.ok && future.error.fieldErrors?.date).toBeTruthy();

    const page = await getLecturerPage(user, on(TODAY));
    expect(page.demos.map((d) => d.dateKey)).toEqual(["2026-11-03", "2026-11-01"]);
    expect(page.demos[0]!.course?.name).toBe("Data Structures");
    expect(page.summary.demoTrend).toEqual({ recent: 3, previous: null, count: 2 });
    expect(page.courses[0]!.demoCount).toBe(2);
  });

  it("deleting a course keeps its demos (unlinked)", async () => {
    const c = await course();
    await saveDemo(
      user,
      {
        topic: "Heaps",
        courseId: c.id,
        date: TODAY,
        durationMin: 20,
        audience: "SELF",
        feedbackMd: "",
      },
      on(TODAY),
    );
    expect((await deleteRecord(user.id, "course", c.id)).ok).toBe(true);
    const page = await getLecturerPage(user, on(TODAY));
    expect(page.demos[0]).toMatchObject({ topic: "Heaps", course: null });
  });
});

describe("publications", () => {
  it("records a submission date once submitted and keeps it", async () => {
    await savePublication(user, { title: "Paper", status: "WRITING", notesMd: "" }, on(TODAY));
    let [p] = (await getLecturerPage(user, on(TODAY))).publications;
    expect(p!.submittedOn).toBeNull();

    await savePublication(
      user,
      { id: p!.id, title: "Paper", status: "SUBMITTED", notesMd: "" },
      on(TODAY),
    );
    [p] = (await getLecturerPage(user, on(TODAY))).publications;
    expect(p!.submittedOn).toBe(TODAY);

    await savePublication(
      user,
      { id: p!.id, title: "Paper", status: "ACCEPTED", notesMd: "" },
      on("2026-12-01"),
    );
    const page = await getLecturerPage(user, on("2026-12-01"));
    expect(page.publications[0]).toMatchObject({ status: "ACCEPTED", submittedOn: TODAY });
    expect(page.summary.publications.ACCEPTED).toBe(1);
  });

  it("the database requires a submission date past writing", async () => {
    await expect(
      db.publication.create({ data: { userId: user.id, title: "x", status: "SUBMITTED" } }),
    ).rejects.toThrow();
  });
});

describe("viva bank", () => {
  it("new questions are due tomorrow and follow the schedule", async () => {
    await saveViva(user, { question: "Explain Big-O", answerMd: "Upper bound…" }, on(TODAY));
    let [q] = (await getLecturerPage(user, on(TODAY))).viva;
    expect(q!.nextReviewOn).toBe("2026-11-06");
    expect(await countDueViva(user, on(TODAY))).toBe(0);
    expect(await countDueViva(user, on("2026-11-06"))).toBe(1);

    const r = await practiseViva(user, q!.id, "remembered", on("2026-11-06"));
    expect(r.ok && r.data.nextReviewOn).toBe("2026-11-09");

    // Editing keeps the schedule.
    await saveViva(
      user,
      { id: q!.id, question: "Explain Big-O notation", answerMd: "" },
      on(TODAY),
    );
    [q] = (await getLecturerPage(user, on(TODAY))).viva;
    expect(q).toMatchObject({ question: "Explain Big-O notation", nextReviewOn: "2026-11-09" });

    const f = await practiseViva(user, q!.id, "forgot", on("2026-11-09"));
    expect(f.ok && f.data.nextReviewOn).toBe("2026-11-10");
  });
});

describe("ownership", () => {
  it("other users can't edit, practise, delete or reference a course", async () => {
    const c = await course();
    await saveViva(user, { question: "Q", answerMd: "" }, on(TODAY));
    const [q] = (await getLecturerPage(user, on(TODAY))).viva;
    const other = { id: (await createTestUser()).user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };

    expect(
      (await saveCourse(other.id, { id: c.id, name: "Hijack", readiness: 1, notesMd: "" })).ok,
    ).toBe(false);
    expect((await practiseViva(other, q!.id, "remembered")).ok).toBe(false);
    expect((await deleteRecord(other.id, "viva", q!.id)).ok).toBe(false);
    expect((await saveViva(other, { question: "Q", courseId: c.id, answerMd: "" })).ok).toBe(false);
    const page = await getLecturerPage(other);
    expect([page.courses, page.viva, page.demos, page.publications]).toEqual([[], [], [], []]);
  });
});
