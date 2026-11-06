"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/action-state";

import { useActionFeedback, useNoResetSubmit } from "../../time-tracking/components/hooks";
import { changePasswordAction, saveProfileAction } from "../actions";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

function hourLabel(h: number) {
  if (h === 0) return "Midnight (00:00)";
  if (h === 12) return "Noon (12:00)";
  return `${String(h).padStart(2, "0")}:00`;
}

export function ProfileForm({
  profile,
  timeZones,
}: {
  profile: { email: string; name: string | null; timezone: string; dayStartHour: number };
  timeZones: string[];
}) {
  const [state, action, pending] = useActionState(saveProfileAction, initialActionState);
  useActionFeedback(state);
  const onSubmit = useNoResetSubmit(action);
  const err = state.fieldErrors;
  const zones = timeZones.includes(profile.timezone) ? timeZones : [profile.timezone, ...timeZones];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Profile & day</h2>
        </CardTitle>
        <CardDescription>
          Signed in as {profile.email}. Your day runs from the start hour to the same hour the next
          day, in your time zone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
          <FormField id="settings-name" label="Name" optional error={err?.name}>
            <Input
              id="settings-name"
              name="name"
              maxLength={80}
              defaultValue={profile.name ?? ""}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="settings-timezone" label="Time zone" error={err?.timezone}>
              <select
                id="settings-timezone"
                name="timezone"
                defaultValue={profile.timezone}
                className={selectClass}
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="settings-day-start" label="Day starts at" error={err?.dayStartHour}>
              <select
                id="settings-day-start"
                name="dayStartHour"
                defaultValue={profile.dayStartHour}
                className={selectClass}
              >
                {Array.from({ length: 13 }, (_, h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialActionState);
  useActionFeedback(state);
  const onSubmit = useNoResetSubmit(action);
  const err = state.fieldErrors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Password</h2>
        </CardTitle>
        <CardDescription>
          Changing it signs you out everywhere, including here. At least 12 characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
          <FormField id="password-current" label="Current password" error={err?.currentPassword}>
            <Input
              id="password-current"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(err?.currentPassword)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="password-new" label="New password" error={err?.newPassword}>
              <Input
                id="password-new"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                aria-invalid={Boolean(err?.newPassword)}
              />
            </FormField>
            <FormField
              id="password-confirm"
              label="Repeat new password"
              error={err?.confirmPassword}
            >
              <Input
                id="password-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                aria-invalid={Boolean(err?.confirmPassword)}
              />
            </FormField>
          </div>
          <div>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              Change password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
