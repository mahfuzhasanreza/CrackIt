"use client";

import {
  type Announcements,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CalendarClock, Ellipsis, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { useToastAction } from "@/hooks/use-toast-action";
import { formatDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { moveApplicationAction } from "../actions";
import { ROUND_LABEL, STATUS_LABEL } from "../labels";
import { isClosed, PIPELINE } from "../rules";
import type { ApplicationCard, Board } from "../service";

import { ApplicationForm, DeleteJobForm, type TrackChoice } from "./job-forms";

const formatDay = (key: string) => formatDateKey(key);

function formatWhen(d: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(d);
}

type DialogState =
  { kind: "add"; status: ApplicationStatus } | { kind: "edit" | "delete"; card: ApplicationCard };

export function KanbanBoard({
  board,
  organizations,
  tracks,
  timezone,
}: {
  board: Board;
  organizations: string[];
  tracks: TrackChoice[];
  timezone: string;
}) {
  const cards = board.columns.flatMap((c) => c.cards);
  // Optimistic status per card while a move is in flight.
  const [optimistic, applyMove] = useOptimistic(
    cards,
    (state, move: { id: string; status: ApplicationStatus }) =>
      state.map((c) => (c.id === move.id ? { ...c, status: move.status } : c)),
  );
  const [, dispatch] = useToastAction(moveApplicationAction);
  const [, startTransition] = useTransition();
  const [active, setActive] = useState<ApplicationCard | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const move = (id: string, status: ApplicationStatus) =>
    startTransition(() => {
      applyMove({ id, status });
      const fd = new FormData();
      fd.set("id", id);
      fd.set("status", status);
      dispatch(fd);
    });

  const sensors = useSensors(
    // A small distance/delay so clicks on links and menus still work.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const nameOf = (id: string | number) => {
    const c = cards.find((x) => x.id === id);
    return c ? `${c.role} at ${c.organization.name}` : "application";
  };
  const columnName = (id: string | number | undefined) =>
    id ? STATUS_LABEL[id as ApplicationStatus] : "no column";
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Picked up ${nameOf(a.id)}.`,
    onDragOver: ({ active: a, over }) => `${nameOf(a.id)} is over ${columnName(over?.id)}.`,
    onDragEnd: ({ active: a, over }) =>
      over ? `${nameOf(a.id)} moved to ${columnName(over.id)}.` : `${nameOf(a.id)} dropped.`,
    onDragCancel: ({ active: a }) => `Moving ${nameOf(a.id)} was cancelled.`,
  };

  const onDragStart = (e: DragStartEvent) =>
    setActive(cards.find((c) => c.id === e.active.id) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const to = e.over?.id as ApplicationStatus | undefined;
    const card = optimistic.find((c) => c.id === e.active.id);
    if (to && card && card.status !== to) move(card.id, to);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To move an application, press space or enter, use the arrow keys to choose a column, then press space or enter again. Press escape to cancel. You can also use its actions menu.",
          },
        }}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
          <div className="flex min-w-max gap-3">
            {PIPELINE.map((status) => (
              <Column
                key={status}
                status={status}
                cards={optimistic.filter((c) => c.status === status)}
                onAdd={() => setDialog({ kind: "add", status })}
                renderCard={(card) => (
                  <DraggableCard
                    key={card.id}
                    card={card}
                    today={board.today}
                    timezone={timezone}
                    onMove={(to) => move(card.id, to)}
                    onEdit={() => setDialog({ kind: "edit", card })}
                    onDelete={() => setDialog({ kind: "delete", card })}
                  />
                )}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {active && <CardBody card={active} today={board.today} timezone={timezone} dragging />}
        </DragOverlay>
      </DndContext>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {dialog?.kind === "add" && (
            <ApplicationForm
              initialStatus={dialog.status}
              organizations={organizations}
              tracks={tracks}
              today={board.today}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog?.kind === "edit" && (
            <EditCard
              card={dialog.card}
              organizations={organizations}
              tracks={tracks}
              today={board.today}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog?.kind === "delete" && (
            <DeleteJobForm
              kind="application"
              id={dialog.card.id}
              label={`${dialog.card.role} at ${dialog.card.organization.name}`}
              note="Its interviews and history are deleted too."
              onDone={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The board only has card fields; the full form needs the rest, fetched from the detail page. */
function EditCard({
  card,
  organizations,
  tracks,
  today,
  onDone,
}: {
  card: ApplicationCard;
  organizations: string[];
  tracks: TrackChoice[];
  today: string;
  onDone: () => void;
}) {
  return (
    <ApplicationForm
      application={{
        id: card.id,
        role: card.role,
        status: card.status,
        organization: card.organization,
        track: card.track,
        jobUrl: card.jobUrl,
        source: card.source,
        appliedOn: card.appliedOn,
        deadlineOn: card.deadlineOn,
        salaryRange: card.salaryRange,
        notesMd: card.notesMd,
      }}
      organizations={organizations}
      tracks={tracks}
      today={today}
      onDone={onDone}
    />
  );
}

function Column({
  status,
  cards,
  onAdd,
  renderCard,
}: {
  status: ApplicationStatus;
  cards: ApplicationCard[];
  onAdd: () => void;
  renderCard: (c: ApplicationCard) => React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABEL[status]} (${cards.length})`}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-xl border bg-muted/40 p-2 transition-colors",
        isOver && "border-primary bg-accent",
        isClosed(status) && "bg-muted/20",
      )}
    >
      <header className="flex items-center justify-between px-1 pt-0.5">
        <h2 className="text-sm font-medium">
          {STATUS_LABEL[status]}{" "}
          <span className="font-normal text-muted-foreground tabular-nums">{cards.length}</span>
        </h2>
        {!isClosed(status) && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onAdd}
            aria-label={`Add application to ${STATUS_LABEL[status]}`}
          >
            <Plus />
          </Button>
        )}
      </header>
      <ul className="flex min-h-24 flex-col gap-2">{cards.map(renderCard)}</ul>
    </section>
  );
}

function DraggableCard({
  card,
  today,
  timezone,
  onMove,
  onEdit,
  onDelete,
}: {
  card: ApplicationCard;
  today: string;
  timezone: string;
  onMove: (to: ApplicationStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable application"
      aria-label={`${card.role} at ${card.organization.name}`}
      className={cn(
        "relative touch-manipulation rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-40",
      )}
    >
      <CardBody card={card} today={today} timezone={timezone} />
      <div className="absolute top-1.5 right-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Actions for ${card.role} at ${card.organization.name}`}
              // Don't start a drag from the menu button.
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {PIPELINE.filter((s) => s !== card.status).map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => onMove(s)}>
                    {STATUS_LABEL[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function CardBody({
  card,
  today,
  timezone,
  dragging = false,
}: {
  card: ApplicationCard;
  today: string;
  timezone: string;
  dragging?: boolean;
}) {
  const deadlineSoon = card.deadlineOn && card.deadlineOn >= today && !isClosed(card.status);
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border bg-card p-3 pr-9 text-sm shadow-xs",
        dragging && "rotate-1 shadow-lg",
      )}
    >
      <Link
        href={`/applications/${card.id}`}
        className="leading-snug font-medium hover:underline"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {card.role}
      </Link>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {card.track && (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: card.track.color }}
          />
        )}
        {card.organization.name}
        {card.jobUrl && (
          <a
            href={card.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Job posting"
            onPointerDown={(e) => e.stopPropagation()}
            className="hover:text-foreground"
          >
            <ExternalLink className="size-3" />
          </a>
        )}
      </span>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {card.nextInterview && (
          <span className="flex items-center gap-1 font-medium text-foreground">
            <CalendarClock className="size-3.5" aria-hidden />
            {ROUND_LABEL[card.nextInterview.round]} ·{" "}
            {formatWhen(card.nextInterview.scheduledAt, timezone)}
          </span>
        )}
        {deadlineSoon && <span>Deadline {formatDay(card.deadlineOn!)}</span>}
        {card.deadlineOn && card.deadlineOn < today && card.status === "WISHLIST" && (
          <span className="text-destructive">Deadline passed</span>
        )}
        {card.appliedOn && !card.nextInterview && <span>Applied {formatDay(card.appliedOn)}</span>}
      </div>
    </div>
  );
}
