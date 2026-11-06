"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import {
  type ApplicationDefaults,
  ApplicationForm,
  DeleteJobForm,
  type TrackChoice,
} from "./job-forms";

/** Edit / delete buttons on the application detail page. */
export function ApplicationActions({
  application,
  organizations,
  tracks,
  today,
}: {
  application: ApplicationDefaults;
  organizations: string[];
  tracks: TrackChoice[];
  today: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setDialog("edit")}>
        <Pencil />
        Edit
      </Button>
      <Button variant="ghost" className="text-destructive" onClick={() => setDialog("delete")}>
        <Trash2 />
        Delete
      </Button>
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {dialog === "edit" && (
            <ApplicationForm
              application={application}
              organizations={organizations}
              tracks={tracks}
              today={today}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog === "delete" && (
            <DeleteJobForm
              kind="application"
              id={application.id}
              label={`${application.role} at ${application.organization.name}`}
              note="Its interviews and history are deleted too."
              onDone={() => {
                setDialog(null);
                router.push("/applications");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
