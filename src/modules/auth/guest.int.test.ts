import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { getOrCreateGuest, refuseGuest } from "./guest";
import { GUEST_EMAIL } from "./guest-rules";

describe("the shared guest account", () => {
  it("is one account, shared by every guest, filled with demo data", async () => {
    // Two first visitors at the same moment still end up in the same account.
    const [a, b] = await Promise.all([getOrCreateGuest(), getOrCreateGuest()]);
    const c = await getOrCreateGuest();
    expect(a.id).toBe(b.id);
    expect(c.id).toBe(a.id);
    expect(await db.user.count({ where: { email: GUEST_EMAIL } })).toBe(1);

    const user = await db.user.findUniqueOrThrow({ where: { id: a.id } });
    expect(user.name).toBe("Guest");
    expect(user.passwordHash).toBeNull(); // only the guest button signs in

    const where = { userId: user.id };
    expect(await db.track.count({ where })).toBe(2);
    expect(await db.timeEntry.count({ where })).toBeGreaterThan(500);
    // No demo timer left running: it would run on for as long as the account lives.
    expect(await db.timeEntry.count({ where: { ...where, endedAt: null } })).toBe(0);
    expect(await db.application.count({ where })).toBeGreaterThan(5);
    expect(await db.problem.count({ where })).toBeGreaterThan(10);
  });

  it("is kept, with whatever guests changed", async () => {
    const guest = await getOrCreateGuest();
    const note = `kept-${randomUUID()}`;
    const track = await db.track.findFirstOrThrow({ where: { userId: guest.id } });
    await db.track.update({ where: { id: track.id }, data: { description: note } });

    expect((await getOrCreateGuest()).id).toBe(guest.id);
    expect((await db.track.findUniqueOrThrow({ where: { id: track.id } })).description).toBe(note);
  });

  it("refuses account-level changes for the guest only", async () => {
    const guest = await getOrCreateGuest();
    expect(refuseGuest(guest)).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(refuseGuest({ email: "me@crackit.local" }).ok).toBe(true);
  });
});
