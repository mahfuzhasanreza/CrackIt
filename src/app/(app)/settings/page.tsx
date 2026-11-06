import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/dal";
import { DataSettings } from "@/modules/backup/components/data-settings";
import { PasswordForm, ProfileForm } from "@/modules/settings/components/general-settings";
import { ActivitySettings, TracksSettings } from "@/modules/settings/components/tracks-settings";
import { getProfile, listActivityTypes, listTracks } from "@/modules/settings/service";

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
  const raw = (await searchParams).tab;
  const tab: Tab = typeof raw === "string" && raw in TABS ? (raw as Tab) : "general";

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

      <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b">
        {(Object.keys(TABS) as Tab[]).map((id) => (
          <Link
            key={id}
            href={id === "general" ? "/settings" : `/settings?tab=${id}`}
            aria-current={tab === id ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              tab === id
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {TABS[id]}
          </Link>
        ))}
      </nav>

      {tab === "general" && <General userId={user.id} />}
      {tab === "tracks" && <TracksSettings tracks={await listTracks(user.id)} />}
      {tab === "activities" && <ActivitySettings activities={await listActivityTypes(user.id)} />}
      {tab === "data" && <DataSettings />}
    </>
  );
}

async function General({ userId }: { userId: string }) {
  const profile = (await getProfile(userId))!;
  return (
    <div className="flex flex-col gap-6">
      <ProfileForm profile={profile} timeZones={Intl.supportedValuesOf("timeZone")} />
      <PasswordForm />
    </div>
  );
}
