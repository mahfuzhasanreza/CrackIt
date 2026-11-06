import "server-only";

import { err, ok, type Result } from "@/lib/result";

import { hashPassword, verifyPassword } from "../auth/password";

import { DEFAULT_TRACKS } from "../tracks-topics/defaults";

import { moved } from "./order";
import * as repo from "./repository";
import type {
  ActivityTypeInput,
  PasswordChangeInput,
  ProfileInput,
  TrackInput,
} from "./validators";

export const getProfile = (userId: string) => repo.findProfile(userId);
export const listTracks = (userId: string) => repo.listTracks(userId);
export const listActivityTypes = (userId: string) => repo.listActivityTypes(userId);

export type TrackRow = Awaited<ReturnType<typeof listTracks>>[number];
export type ActivityTypeRow = Awaited<ReturnType<typeof listActivityTypes>>[number];

export async function saveProfile(userId: string, input: ProfileInput): Promise<Result<null>> {
  await repo.updateProfile(userId, {
    name: input.name ?? null,
    timezone: input.timezone,
    dayStartHour: input.dayStartHour,
  });
  return ok(null);
}

/** Verifies the current password; on success every session (this one included) is signed out. */
export async function changePassword(
  userId: string,
  input: PasswordChangeInput,
): Promise<Result<null>> {
  const user = await repo.findPasswordHash(userId);
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
    return err("VALIDATION", "Your current password is wrong.", {
      currentPassword: ["Wrong password"],
    });
  }
  await repo.setPassword(userId, await hashPassword(input.newPassword));
  return ok(null);
}

// ── Tracks ──────────────────────────────────────────────────────────────────

export async function saveTrack(userId: string, input: TrackInput): Promise<Result<null>> {
  if (await repo.findTrackByName(userId, input.name, input.id)) {
    return err("CONFLICT", "You already have a track with that name.", {
      name: ["Already exists"],
    });
  }
  const data = {
    name: input.name,
    description: input.description ?? null,
    color: input.color.toLowerCase(),
    weeklyTargetMinutes:
      input.weeklyTargetHours === undefined ? null : Math.round(input.weeklyTargetHours * 60),
    isActive: input.isActive,
  };
  if (!input.id) {
    await repo.createTrack(userId, data, input.topics);
    return ok(null);
  }
  // Topics of an existing track are edited on the Topics page.
  return (await repo.updateTrack(userId, input.id, data))
    ? ok(null)
    : err("NOT_FOUND", "Track not found.");
}

/** Add one of the starter templates (track + its topic roadmap) as the user's own track. */
export async function addTemplateTrack(userId: string, name: string): Promise<Result<null>> {
  const template = DEFAULT_TRACKS.find((t) => t.name === name);
  if (!template) return err("NOT_FOUND", "Unknown template.");
  if (await repo.findTrackByName(userId, template.name)) {
    return err("CONFLICT", `You already have a track called “${template.name}”.`);
  }
  await repo.createTrack(
    userId,
    {
      name: template.name,
      description: template.description,
      color: template.color,
      weeklyTargetMinutes: template.weeklyTargetMinutes,
      isActive: true,
    },
    template.topics,
  );
  return ok(null);
}

/** Deletes the track and its topics; time entries, notes and applications keep their history. */
export async function deleteTrack(userId: string, id: string): Promise<Result<null>> {
  return (await repo.deleteTrack(userId, id)) ? ok(null) : err("NOT_FOUND", "Track not found.");
}

export async function moveRow(
  kind: "track" | "activityType",
  userId: string,
  id: string,
  direction: "up" | "down",
): Promise<Result<null>> {
  const rows: { id: string }[] =
    kind === "track" ? await repo.listTracks(userId) : await repo.listActivityTypes(userId);
  if (!rows.some((r) => r.id === id)) return err("NOT_FOUND", "Not found.");
  const next = moved(rows, id, direction);
  if (next) {
    await repo.reorder(
      kind,
      userId,
      next.map((r) => r.id),
    );
  }
  return ok(null);
}

// ── Activity types ──────────────────────────────────────────────────────────

export async function saveActivityType(
  userId: string,
  input: ActivityTypeInput,
): Promise<Result<null>> {
  if (await repo.findActivityTypeByName(userId, input.name, input.id)) {
    return err("CONFLICT", "You already have an activity with that name.", {
      name: ["Already exists"],
    });
  }
  const data = {
    name: input.name,
    color: input.color.toLowerCase(),
    category: input.category,
    isProductive: input.isProductive,
    isArchived: input.isArchived,
  };
  if (!input.id) {
    await repo.createActivityType(userId, data);
    return ok(null);
  }
  return (await repo.updateActivityType(userId, input.id, data))
    ? ok(null)
    : err("NOT_FOUND", "Activity not found.");
}

/** Only unused activities can be deleted; ones with history are archived instead. */
export async function deleteActivityType(userId: string, id: string): Promise<Result<null>> {
  const used = await repo.countEntriesForActivity(userId, id);
  if (used > 0) {
    return err(
      "CONFLICT",
      `It's used by ${used} time ${used === 1 ? "entry" : "entries"} — archive it instead.`,
    );
  }
  return (await repo.deleteActivityType(userId, id))
    ? ok(null)
    : err("NOT_FOUND", "Activity not found.");
}
