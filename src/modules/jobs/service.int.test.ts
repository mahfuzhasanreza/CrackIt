import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";

import {
  deleteRecord,
  getApplicationDetail,
  getBoard,
  getInterviewsPage,
  getUpcomingInterviews,
  moveApplication,
  saveApplication,
  saveInterview,
  saveMock,
  saveOrganization,
} from "./service";
import type { ApplicationFormInput, InterviewFormInput } from "./validators";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let ctx: Ctx;
let user: { id: string; timezone: string; dayStartHour: number };
const on = (key: string) => new Date(`${key}T04:00:00Z`); // 10:00 Dhaka
const TODAY = "2026-11-05";

beforeEach(async () => {
  ctx = await createTestUser();
  user = { id: ctx.user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };
});

function app(overrides: Partial<ApplicationFormInput> = {}): ApplicationFormInput {
  return {
    organizationName: "Acme",
    organizationType: "COMPANY",
    role: "Software Engineer",
    status: "WISHLIST",
    notesMd: "",
    ...overrides,
  };
}

async function create(overrides: Partial<ApplicationFormInput> = {}) {
  const res = await saveApplication(user, app(overrides), on(TODAY));
  if (!res.ok) throw new Error(res.error.message);
  return res.data.id;
}

const events = (id: string) =>
  db.applicationEvent.findMany({ where: { applicationId: id }, orderBy: { at: "asc" } });

function interview(
  applicationId: string,
  overrides: Partial<InterviewFormInput> = {},
): InterviewFormInput {
  return {
    applicationId,
    round: "TECHNICAL",
    scheduledAt: "2026-11-10T15:00",
    outcome: "PENDING",
    questionsMd: "",
    myAnswersMd: "",
    lessonsMd: "",
    ...overrides,
  };
}

describe("applications", () => {
  it("creates the organization once (case-insensitive) and logs creation", async () => {
    const a = await create();
    await create({ organizationName: "ACME", role: "Backend Engineer" });
    expect(await db.organization.count({ where: { userId: user.id } })).toBe(1);
    expect((await events(a)).map((e) => [e.fromStatus, e.toStatus])).toEqual([[null, "WISHLIST"]]);
  });

  it("moving across the board records applied date and history", async () => {
    const a = await create();
    expect((await moveApplication(user, a, "APPLIED", on(TODAY))).ok).toBe(true);
    expect((await moveApplication(user, a, "APPLIED", on(TODAY))).ok && true).toBe(true); // no-op
    await moveApplication(user, a, "REJECTED", on("2026-11-20"));

    const detail = await getApplicationDetail(user, a, on("2026-11-20"));
    expect(detail?.application).toMatchObject({ status: "REJECTED", appliedOn: TODAY });
    expect(detail?.application.events.map((e) => e.toStatus)).toEqual([
      "WISHLIST",
      "APPLIED",
      "REJECTED",
    ]);

    const board = await getBoard(user, on("2026-11-20"));
    expect(board.columns.find((c) => c.status === "REJECTED")!.cards.map((c) => c.id)).toEqual([a]);
  });

  it("creating straight into Applied uses today unless a date is given; rejects future dates", async () => {
    const a = await create({ status: "APPLIED" });
    const b = await create({ status: "OA", role: "SRE", appliedOn: "2026-10-20" });
    expect((await getApplicationDetail(user, a))?.application.appliedOn).toBe(TODAY);
    expect((await getApplicationDetail(user, b))?.application.appliedOn).toBe("2026-10-20");
    const future = await saveApplication(
      user,
      app({ status: "APPLIED", appliedOn: "2026-11-06" }),
      on(TODAY),
    );
    expect(!future.ok && future.error.fieldErrors?.appliedOn).toBeTruthy();
  });

  it("editing the status through the form logs an event", async () => {
    const a = await create({ status: "APPLIED" });
    await saveApplication(user, app({ id: a, status: "OFFER", salaryRange: "100k" }), on(TODAY));
    expect((await events(a)).map((e) => e.toStatus)).toEqual(["APPLIED", "OFFER"]);
  });

  it("the database requires an applied date past the wishlist", async () => {
    const org = await db.organization.create({ data: { userId: user.id, name: "X" } });
    await expect(
      db.application.create({
        data: { userId: user.id, organizationId: org.id, role: "x", status: "APPLIED" },
      }),
    ).rejects.toThrow();
  });
});

describe("interviews", () => {
  it("an OA round moves an applied application to OA; a technical round to interviewing", async () => {
    const a = await create({ status: "APPLIED" });
    const oa = await saveInterview(user, interview(a, { round: "OA" }), on(TODAY));
    expect(oa.ok && oa.data.movedTo).toBe("OA");
    const tech = await saveInterview(user, interview(a), on(TODAY));
    expect(tech.ok && tech.data.movedTo).toBe("INTERVIEWING");
    expect((await events(a)).map((e) => e.toStatus)).toEqual(["APPLIED", "OA", "INTERVIEWING"]);
  });

  it("stores times in the user's timezone and lists upcoming vs past", async () => {
    const a = await create({ status: "APPLIED" });
    await saveInterview(user, interview(a), on(TODAY)); // 15:00 Dhaka = 09:00Z
    await saveInterview(
      user,
      interview(a, { round: "HR", scheduledAt: "2026-11-01T11:00" }),
      on(TODAY),
    );

    const page = await getInterviewsPage(user, on(TODAY));
    expect(page.upcoming.map((i) => i.scheduledAt.toISOString())).toEqual([
      "2026-11-10T09:00:00.000Z",
    ]);
    expect(page.past.map((i) => i.round)).toEqual(["HR"]);

    const board = await getBoard(user, on(TODAY));
    const card = board.columns.find((c) => c.status === "INTERVIEWING")!.cards[0]!;
    expect(card.nextInterview?.round).toBe("TECHNICAL");
    expect(card.interviewCount).toBe(2);

    expect((await getUpcomingInterviews(user.id, on(TODAY))).length).toBe(1);
    expect((await getUpcomingInterviews(user.id, on(TODAY), 3)).length).toBe(0);
  });

  it("editing an interview doesn't move the application", async () => {
    const a = await create({ status: "OFFER", appliedOn: "2026-10-01" });
    const res = await saveInterview(user, interview(a, { round: "HR" }), on(TODAY));
    expect(res.ok && res.data.movedTo).toBeNull();
  });
});

describe("organizations, mocks and ownership", () => {
  it("renames an organization, rejecting a duplicate name", async () => {
    await create();
    await create({ organizationName: "Globex", role: "x" });
    const [acme] = await db.organization.findMany({ where: { userId: user.id, name: "Acme" } });
    const dup = await saveOrganization(user.id, {
      id: acme!.id,
      name: "globex",
      type: "COMPANY",
      notesMd: "",
    });
    expect(!dup.ok && dup.error.code).toBe("CONFLICT");
    expect(
      (
        await saveOrganization(user.id, {
          id: acme!.id,
          name: "Acme Corp",
          type: "COMPANY",
          notesMd: "",
        })
      ).ok,
    ).toBe(true);
  });

  it("logs mock interviews, not in the future", async () => {
    expect(
      (
        await saveMock(
          user,
          { date: TODAY, type: "SYSTEM_DESIGN", score: 3, feedbackMd: "" },
          on(TODAY),
        )
      ).ok,
    ).toBe(true);
    const future = await saveMock(
      user,
      { date: "2026-11-06", type: "HR", feedbackMd: "" },
      on(TODAY),
    );
    expect(future.ok).toBe(false);
    expect((await getInterviewsPage(user, on(TODAY))).mocks).toHaveLength(1);
  });

  it("other users can't move, interview, delete or see applications", async () => {
    const a = await create();
    const other = { id: (await createTestUser()).user.id, timezone: "Asia/Dhaka", dayStartHour: 4 };
    expect((await moveApplication(other, a, "OFFER")).ok).toBe(false);
    expect((await saveInterview(other, interview(a))).ok).toBe(false);
    expect((await deleteRecord(other.id, "application", a)).ok).toBe(false);
    expect(await getApplicationDetail(other, a)).toBeNull();
    expect((await getBoard(other)).columns.every((c) => c.cards.length === 0)).toBe(true);
  });

  it("deleting an organization deletes its applications and interviews", async () => {
    const a = await create({ status: "APPLIED" });
    await saveInterview(user, interview(a), on(TODAY));
    const org = await db.organization.findFirstOrThrow({ where: { userId: user.id } });
    expect((await deleteRecord(user.id, "organization", org.id)).ok).toBe(true);
    expect(await db.application.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.interview.count({ where: { userId: user.id } })).toBe(0);
  });
});
