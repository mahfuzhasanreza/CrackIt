"use client";

import { BellRing } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import {
  setTimerNotificationEnabled,
  useNotificationSupport,
  useTimerNotificationEnabled,
} from "./timer-notification-store";

/**
 * "Show a notification while the timer runs" — phones and tablets only, saved on this device.
 * Renders nothing on computers.
 */
export function TimerNotificationSetting() {
  const support = useNotificationSupport();
  const enabled = useTimerNotificationEnabled();
  const [blocked, setBlocked] = useState(false);

  if (support === null || support === "unsupported") return null;

  const denied = blocked || (support === "supported" && Notification.permission === "denied");
  const on = enabled && support === "supported" && Notification.permission === "granted";

  async function toggle(next: boolean) {
    if (!next) return setTimerNotificationEnabled(false);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setBlocked(false);
      setTimerNotificationEnabled(true);
    } else {
      setBlocked(true);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <BellRing className="size-4" aria-hidden />
            Timer notification
          </h2>
        </CardTitle>
        <CardDescription>
          Keep a notification on this phone while a timer runs, with a Stop button (Android). Saved
          on this device only.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {support === "needs-install" ? (
          <p className="text-muted-foreground">
            On iPhone, add CrackIt to your Home Screen first (Share → Add to Home Screen), then open
            it from there to turn this on.
          </p>
        ) : (
          <>
            <label className="flex items-center justify-between gap-4">
              <span className="font-medium">Show while the timer runs</span>
              <input
                type="checkbox"
                role="switch"
                checked={on}
                disabled={denied && !on}
                onChange={(e) => void toggle(e.target.checked)}
                className="size-5 accent-primary"
              />
            </label>
            {denied && (
              <p role="alert" className="text-destructive">
                Notifications are blocked for CrackIt. Allow them in your browser or phone settings,
                then come back.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
