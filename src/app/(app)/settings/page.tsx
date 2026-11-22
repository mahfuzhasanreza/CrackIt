import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { TabNav } from "@/components/tab-nav";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/modules/auth/dal";
import { GUEST_LOCKED_MESSAGE, isGuestEmail } from "@/modules/auth/guest-rules";
import { DataSettings } from "@/modules/backup/components/data-settings";
import { PasswordForm, ProfileForm } from "@/modules/settings/components/general-settings";
import { ActivitySettings, TracksSettings } from "@/modules/settings/components/tracks-settings";
import { getProfile, listActivityTypes, listTracks } from "@/modules/settings/service";
import { TimerNotificationSetting } from "@/modules/time-tracking/components/timer-notification-setting";

export const metadata: Metadata = { title: "Settings" };

const TABS = {
  general: "General",
  tracks: "Tracks",
  activities: "Activity types",
  data: "Data",
} as const;
type Tab = keyof typeof TABS;

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-14 w-full max-w-72" />
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        <SettingsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SettingsContent({ searchParams }: Pick<PageProps<"/settings">, "searchParams">) {
  const user = await requireUser();
  const params = await searchParams;
  const raw = params.tab;
  const tab: Tab = typeof raw === "string" && raw in TABS ? (raw as Tab) : "general";
  const guest = isGuestEmail(user.email);

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your day, tracks, activities, and your data. Goals live on{" "}
          <Link href="/analytics" className="underline underline-offset-2 hover:text-foreground">
            Analytics
          </Link>
          .
        </p>
      </header>

      <TabNav
        label="Settings sections"
        current={tab}
        items={(Object.keys(TABS) as Tab[]).map((id) => ({
          id,
          label: TABS[id],
          href: id === "general" ? "/settings" : `/settings?tab=${id}`,
        }))}
      />

      {tab === "general" && <General userId={user.id} guest={guest} />}
      {tab === "tracks" && (
        <TracksSettings tracks={await listTracks(user.id)} openAdd={params.add === "1"} />
      )}
      {tab === "activities" && <ActivitySettings activities={await listActivityTypes(user.id)} />}
      {tab === "data" && <DataSettings canRestore={!guest} />}
    </>
  );
}

async function General({ userId, guest }: { userId: string; guest: boolean }) {
  if (guest) {
    // The shared guest account: profile and password belong to everyone, so they're locked.
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Profile & password</h2>
            </CardTitle>
            <CardDescription>{GUEST_LOCKED_MESSAGE}</CardDescription>
          </CardHeader>
        </Card>
        <TimerNotificationSetting />
      </div>
    );
  }
  const profile = (await getProfile(userId))!;
  return (
    <div className="flex flex-col gap-6">
      <ProfileForm profile={profile} timeZones={Intl.supportedValuesOf("timeZone")} />
      <TimerNotificationSetting />
      <PasswordForm />
    </div>
  );
}
