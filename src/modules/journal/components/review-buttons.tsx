"use client";

import { Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { reviewLearningEntryAction } from "../actions";

import { useToastAction } from "./use-toast-action";

/** "Remembered" / "Forgot" for one entry; the server schedules the next revision. */
export function ReviewButtons({ id, title }: { id: string; title: string }) {
  const [, action, pending] = useToastAction(reviewLearningEntryAction);
  return (
    <form action={action} className="flex gap-1.5">
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        name="outcome"
        value="remembered"
        size="sm"
        variant="outline"
        disabled={pending}
        aria-label={`Remembered "${title}"`}
      >
        <Check />
        Remembered
      </Button>
      <Button
        type="submit"
        name="outcome"
        value="forgot"
        size="sm"
        variant="ghost"
        disabled={pending}
        aria-label={`Forgot "${title}"`}
      >
        <RotateCcw />
        Forgot
      </Button>
    </form>
  );
}
