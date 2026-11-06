import { describe, expect, it } from "vitest";

import { notificationSupport, TIMER_NOTIFICATION_TAG, timerNotification } from "./notification";

describe("timer notification", () => {
  const startedAt = new Date("2026-11-07T04:30:00Z"); // 10:30 in Dhaka

  it("names the activity, where it's going and when it started", () => {
    const n = timerNotification(
      { id: "e1", name: "Study", track: "SWE / Full-Stack", topic: "Graphs", startedAt },
      "Asia/Dhaka",
    );
    expect(n).toEqual({
      title: "Timer running: Study",
      body: "SWE / Full-Stack › Graphs\nStarted 10:30",
      tag: TIMER_NOTIFICATION_TAG,
      entryId: "e1",
      timestamp: startedAt.getTime(),
    });
  });

  it("skips the track line for activities without one", () => {
    const n = timerNotification(
      { id: "e2", name: "Break / Gap", track: null, topic: null, startedAt },
      "Asia/Dhaka",
    );
    expect(n.body).toBe("Started 10:30");
  });

  it("is offered on touch devices only; iOS tabs need the Home Screen app", () => {
    const phone = { coarsePointer: true, serviceWorker: true, notifications: true };
    expect(notificationSupport(phone)).toBe("supported");
    expect(notificationSupport({ ...phone, notifications: false })).toBe("needs-install");
    expect(notificationSupport({ ...phone, coarsePointer: false })).toBe("unsupported");
    expect(notificationSupport({ ...phone, serviceWorker: false })).toBe("unsupported");
  });
});
