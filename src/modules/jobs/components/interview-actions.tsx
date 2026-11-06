"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { ROUND_LABEL } from "../labels";

import { DeleteJobForm, type InterviewDefaults, InterviewForm } from "./job-forms";

/** Edit / delete on the interview detail page. */
export function InterviewActions({
  interview,
  timezone,
}: {
  interview: InterviewDefaults;
  timezone: string;
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
            <InterviewForm
              interview={interview}
              timezone={timezone}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog === "delete" && (
            <DeleteJobForm
              kind="interview"
              id={interview.id}
              label={`${ROUND_LABEL[interview.round]} interview`}
              onDone={() => {
                setDialog(null);
                router.push("/interviews");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
