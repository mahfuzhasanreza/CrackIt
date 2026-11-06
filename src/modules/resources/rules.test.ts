import { describe, expect, it } from "vitest";

import {
  applyProgress,
  applyStatus,
  progressOf,
  resolveSave,
  type ResourceState,
  unitLabelFor,
} from "./rules";

const today = "2026-11-08";
const planned: ResourceState = {
  status: "PLANNED",
  completedUnits: 0,
  totalUnits: 10,
  startedOn: null,
  finishedOn: null,
};
const reading: ResourceState = {
  ...planned,
  status: "IN_PROGRESS",
  completedUnits: 4,
  startedOn: "2026-10-01",
};

describe("resource rules", () => {
  it("labels units by type unless overridden", () => {
    expect(unitLabelFor("BOOK", null)).toBe("chapters");
    expect(unitLabelFor("SHEET", "  ")).toBe("problems");
    expect(unitLabelFor("COURSE", "modules")).toBe("modules");
  });

  it("computes progress, with DONE always complete and no total → null", () => {
    expect(progressOf(reading)).toBe(0.4);
    expect(progressOf({ ...reading, totalUnits: null })).toBeNull();
    expect(progressOf({ ...reading, totalUnits: null, status: "DONE" })).toBe(1);
  });

  it("progress starts a planned resource and finishes it at the total", () => {
    expect(applyProgress(planned, 1, today)).toMatchObject({
      status: "IN_PROGRESS",
      startedOn: today,
      finishedOn: null,
    });
    expect(applyProgress(reading, 10, today)).toMatchObject({
      status: "DONE",
      completedUnits: 10,
      startedOn: "2026-10-01",
      finishedOn: today,
    });
  });

  it("going below the total re-opens a finished resource", () => {
    const done = applyStatus(reading, "DONE", "2026-11-01");
    expect(applyProgress(done, 9, today)).toMatchObject({
      status: "IN_PROGRESS",
      completedUnits: 9,
      finishedOn: null,
      startedOn: "2026-10-01",
    });
  });

  it("open-ended resources only count up", () => {
    const open = { ...reading, totalUnits: null };
    expect(applyProgress(open, 50, today)).toMatchObject({
      status: "IN_PROGRESS",
      completedUnits: 50,
    });
  });

  it("progress on a dropped resource picks it back up", () => {
    const dropped = applyStatus(reading, "DROPPED", today);
    expect(dropped).toMatchObject({ status: "DROPPED", startedOn: "2026-10-01" });
    expect(applyProgress(dropped, 5, today).status).toBe("IN_PROGRESS");
    expect(applyProgress(dropped, 4, today).status).toBe("DROPPED");
  });

  it("marking done fills progress and keeps an earlier finish date", () => {
    expect(applyStatus(reading, "DONE", today)).toMatchObject({
      completedUnits: 10,
      finishedOn: today,
    });
    const done = { ...reading, status: "DONE" as const, finishedOn: "2026-11-01" };
    expect(applyStatus(done, "DONE", today).finishedOn).toBe("2026-11-01");
    expect(applyStatus(reading, "PLANNED", today)).toMatchObject({
      startedOn: null,
      finishedOn: null,
    });
  });

  describe("resolveSave", () => {
    it("new resource: entered progress drives the status", () => {
      const input = { status: "PLANNED" as const, totalUnits: 10 };
      expect(resolveSave(null, { ...input, completedUnits: 0 }, today).status).toBe("PLANNED");
      expect(resolveSave(null, { ...input, completedUnits: 3 }, today)).toMatchObject({
        status: "IN_PROGRESS",
        startedOn: today,
      });
      expect(
        resolveSave(null, { status: "IN_PROGRESS", totalUnits: 10, completedUnits: 10 }, today),
      ).toMatchObject({ status: "DONE", finishedOn: today });
    });

    it("an explicitly changed status wins over the progress", () => {
      expect(
        resolveSave(reading, { status: "DONE", totalUnits: 10, completedUnits: 4 }, today),
      ).toMatchObject({ status: "DONE", completedUnits: 10 });
      expect(
        resolveSave(reading, { status: "DROPPED", totalUnits: 10, completedUnits: 6 }, today),
      ).toMatchObject({ status: "DROPPED", completedUnits: 6 });
    });

    it("same status: a raised total re-opens a finished resource", () => {
      const done = applyStatus(reading, "DONE", "2026-11-01");
      expect(
        resolveSave(done, { status: "DONE", totalUnits: 12, completedUnits: 10 }, today),
      ).toMatchObject({ status: "IN_PROGRESS", finishedOn: null });
    });
  });
});
