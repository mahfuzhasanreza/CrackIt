"use client";

import { Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { formatDateKey as formatDay } from "@/lib/dates";

import { ROUND_LABEL } from "../labels";

import { DeleteJobForm, type MockDefaults, MockForm, type TrackChoice } from "./job-forms";

type Mock = MockDefaults & { track: { id: string; name: string; color: string } | null };

export function MockList({
  mocks,
  tracks,
  today,
}: {
  mocks: Mock[];
  tracks: TrackChoice[];
  today: string;
}) {
  const [dialog, setDialog] = useState<
    { kind: "add" } | { kind: "edit" | "delete"; mock: Mock } | null
  >(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Practice rounds with a partner or platform.</p>
        <Button variant="outline" onClick={() => setDialog({ kind: "add" })}>
          <Plus />
          Log mock interview
        </Button>
      </div>
      {mocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No mock interviews yet.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {mocks.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-medium">
                  {ROUND_LABEL[m.type]}
                  {m.partner && (
                    <span className="font-normal text-muted-foreground"> · {m.partner}</span>
                  )}
                </h3>
                <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>{formatDay(m.dateKey)}</span>
                  {m.track && <span>{m.track.name}</span>}
                  {m.score && <span>Score {m.score}/5</span>}
                </p>
                {m.feedbackMd.trim() && <Markdown className="mt-2">{m.feedbackMd}</Markdown>}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    aria-label={`Actions for mock ${ROUND_LABEL[m.type]} on ${formatDay(m.dateKey)}`}
                  >
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", mock: m })}>
                    <Pencil />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDialog({ kind: "delete", mock: m })}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {dialog?.kind === "add" && (
            <MockForm tracks={tracks} today={today} onDone={() => setDialog(null)} />
          )}
          {dialog?.kind === "edit" && (
            <MockForm
              key={dialog.mock.id}
              mock={dialog.mock}
              tracks={tracks}
              today={today}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog?.kind === "delete" && (
            <DeleteJobForm
              kind="mock"
              id={dialog.mock.id}
              label={`${ROUND_LABEL[dialog.mock.type]} mock`}
              onDone={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
