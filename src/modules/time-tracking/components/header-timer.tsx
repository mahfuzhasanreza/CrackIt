import { requireUser } from "../../auth/dal";
import { getRunningEntry } from "../service";

import { HeaderTimerBadge } from "./header-timer-badge";

/** Server part of the header timer. Render inside <Suspense>. */
export async function HeaderTimer() {
  const user = await requireUser();
  const running = await getRunningEntry(user.id);
  return (
    <HeaderTimerBadge
      serverNow={new Date()}
      running={
        running && {
          id: running.id,
          name: running.activityType.name,
          track: running.track?.name ?? null,
          topic: running.topic?.name ?? null,
          color: running.activityType.color,
          startedAt: running.startedAt,
        }
      }
    />
  );
}
