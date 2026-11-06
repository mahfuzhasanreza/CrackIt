import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createTestUser } from "../../../test/factories";
import { hashPassword, verifyPassword } from "../auth/password";

import {
  changePassword,
  deleteActivityType,
  deleteTrack,
  getProfile,
  listActivityTypes,
  listTracks,
  moveRow,
  saveActivityType,
  saveProfile,
  saveTrack,
} from "./service";
import { activityTypeSchema, passwordChangeSchema, profileSchema, trackSchema } from "./validators";

type Ctx = Awaited<ReturnType<typeof createTestUser>>;
let ctx: Ctx;
let userId: string;

beforeEach(async () => {
  ctx = await createTestUser();
  userId = ctx.user.id;
});

describe("settings", () => {
  it("saves the profile and validates the time zone", async () => {
    const input = profileSchema.parse({
      name: "Mahfuz",
      timezone: "Europe/London",
      dayStartHour: "5",
    });
    expect((await saveProfile(userId, input)).ok).toBe(true);
    expect(await getProfile(userId)).toMatchObject({
      name: "Mahfuz",
      timezone: "Europe/London",
      dayStartHour: 5,
    });
    expect(profileSchema.safeParse({ timezone: "Mars/Olympus", dayStartHour: "4" }).success).toBe(
      false,
    );
    expect(profileSchema.safeParse({ timezone: "UTC", dayStartHour: "13" }).success).toBe(false);
  });

  it("changes the password only with the right current one, and ends every session", async () => {
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword("old-password-1234") },
    });
    const input = (current: string) =>
      passwordChangeSchema.parse({
        currentPassword: current,
        newPassword: "new-password-5678",
        confirmPassword: "new-password-5678",
      });

    expect((await changePassword(userId, input("wrong-password"))).ok).toBe(false);
    expect((await changePassword(userId, input("old-password-1234"))).ok).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword(user.passwordHash!, "new-password-5678")).toBe(true);
    expect(user.sessionVersion).toBe(1);

    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "a",
        newPassword: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "a",
        newPassword: "new-password-5678",
        confirmPassword: "different-5678",
      }).success,
    ).toBe(false);
  });

  it("adds, edits, archives, reorders and deletes tracks", async () => {
    const add = trackSchema.parse({
      name: "DevOps",
      color: "#1BAF7A",
      weeklyTargetHours: "2.5",
      isActive: "on",
    });
    expect((await saveTrack(userId, add)).ok).toBe(true);
    // Case-insensitive name conflict.
    expect((await saveTrack(userId, { ...add, name: "devops" })).ok).toBe(false);

    let tracks = await listTracks(userId);
    const devops = tracks.at(-1)!;
    expect(devops).toMatchObject({
      name: "DevOps",
      color: "#1baf7a",
      weeklyTargetMinutes: 150,
      isActive: true,
    });

    const archived = trackSchema.parse({ id: devops.id, name: "DevOps", color: "#1baf7a" });
    await saveTrack(userId, archived);
    expect((await listTracks(userId)).at(-1)!.isActive).toBe(false);

    await moveRow("track", userId, devops.id, "up");
    tracks = await listTracks(userId);
    expect(tracks.at(-2)!.id).toBe(devops.id);
    // Moving the first one up is a no-op.
    expect((await moveRow("track", userId, tracks[0]!.id, "up")).ok).toBe(true);

    const other = await createTestUser();
    expect((await deleteTrack(other.user.id, devops.id)).ok).toBe(false);
    expect((await moveRow("track", other.user.id, devops.id, "down")).ok).toBe(false);
    expect((await deleteTrack(userId, devops.id)).ok).toBe(true);
  });

  it("a new track can come with its topic outline", async () => {
    const input = trackSchema.parse({
      name: "Machine Learning",
      color: "#6250d6",
      isActive: "on",
      topics:
        "Foundations\n  Linear algebra\n  Probability\nModels\n  - Trees\n    Gradient boosting",
    });
    expect((await saveTrack(userId, input)).ok).toBe(true);
    const track = (await listTracks(userId)).find((t) => t.name === "Machine Learning")!;
    const topics = await db.topic.findMany({
      where: { trackId: track.id },
      orderBy: [{ sortOrder: "asc" }],
    });
    expect(topics).toHaveLength(6);
    const byName = new Map(topics.map((t) => [t.name, t]));
    expect(byName.get("Foundations")!.parentId).toBeNull();
    expect(byName.get("Probability")!.parentId).toBe(byName.get("Foundations")!.id);
    expect(byName.get("Probability")!.sortOrder).toBe(1);
    expect(byName.get("Gradient boosting")!.parentId).toBe(byName.get("Trees")!.id);

    // A bad outline is a field error and creates nothing.
    const bad = trackSchema.safeParse({ name: "X", color: "#6250d6", topics: "A\na" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.flatten().fieldErrors.topics?.[0]).toMatch(/listed twice/);
  });

  it("deletes only unused activity types", async () => {
    const study = ctx.activity("Study");
    await db.timeEntry.create({
      data: {
        userId,
        activityTypeId: study.id,
        trackId: ctx.track("SWE / Full-Stack").id,
        startedAt: new Date("2026-11-01T03:00:00Z"),
        endedAt: new Date("2026-11-01T04:00:00Z"),
      },
    });
    const used = await deleteActivityType(userId, study.id);
    expect(used.ok).toBe(false);
    if (!used.ok) expect(used.error.message).toMatch(/archive it instead/);

    const input = activityTypeSchema.parse({
      name: "Reading",
      color: "#6250d6",
      category: "STUDY",
      isProductive: "on",
    });
    expect((await saveActivityType(userId, input)).ok).toBe(true);
    const reading = (await listActivityTypes(userId)).find((a) => a.name === "Reading")!;
    expect(reading).toMatchObject({ category: "STUDY", isProductive: true, isArchived: false });
    expect((await deleteActivityType(userId, reading.id)).ok).toBe(true);
  });
});
