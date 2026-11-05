import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/modules/auth/dal";
import { ProjectsGrid } from "@/modules/projects/components/projects-grid";
import { listProjects } from "@/modules/projects/service";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-14 w-full max-w-72" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        }
      >
        <ProjectsContent />
      </Suspense>
    </div>
  );
}

async function ProjectsContent() {
  const user = await requireUser();
  return <ProjectsGrid projects={await listProjects(user.id)} />;
}
