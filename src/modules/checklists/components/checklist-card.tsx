"use client";

import { ArrowDown, ArrowUp, Ellipsis, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { ProgressMeter } from "@/components/progress-meter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToastAction } from "@/hooks/use-toast-action";

import { useNoResetSubmit } from "../../time-tracking/components/hooks";
import {
  deleteChecklistAction,
  deleteItemAction,
  moveItemAction,
  saveItemAction,
  updateChecklistAction,
} from "../actions";
import type { ChecklistView, ItemView } from "../service";

import { ChecklistFormFields, type TrackChoice } from "./checklist-form-fields";
import { ItemRow, PRIORITY_LABEL } from "./item-row";

export const TYPE_LABEL = {
  ROADMAP: "Roadmap",
  ONE_OFF: "To-do list",
  HABIT: "Habits",
} as const;

type DialogState =
  | { kind: "edit-list" }
  | { kind: "delete-list" }
  | { kind: "edit-item"; item: ItemView }
  | { kind: "delete-item"; item: ItemView };

export function ChecklistCard({
  checklist,
  tracks,
}: {
  checklist: ChecklistView;
  tracks: TrackChoice[];
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const isHabit = checklist.type === "HABIT";
  const { done, total } = checklist.progress;
  const subtitle = [
    isHabit
      ? checklist.recurrence === "WEEKLY"
        ? "Weekly habits"
        : "Daily habits"
      : TYPE_LABEL[checklist.type],
    checklist.track?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card role="region" aria-labelledby={`list-${checklist.id}-title`}>
      <CardHeader>
        <CardTitle>
          <h3 id={`list-${checklist.id}-title`}>{checklist.title}</h3>
        </CardTitle>
        <CardDescription>{subtitle}</CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Actions for ${checklist.title}`}
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setDialog({ kind: "edit-list" })}>
                <Pencil />
                Edit list
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDialog({ kind: "delete-list" })}
              >
                <Trash2 />
                Delete list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {checklist.description && (
          <p className="text-sm text-muted-foreground">{checklist.description}</p>
        )}
        {total > 0 && (
          <div className="flex items-center gap-3">
            <ProgressMeter
              value={done / total}
              label={`${checklist.title} progress`}
              valueText={`${done} of ${total} done`}
            />
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {done}/{total}
              {isHabit ? (checklist.recurrence === "WEEKLY" ? " this week" : " today") : ""}
            </span>
          </div>
        )}

        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {checklist.items.map((item, i) => (
              <ItemRow
                key={item.id}
                item={item}
                actions={
                  <ItemMenu
                    item={item}
                    isFirst={i === 0}
                    isLast={i === checklist.items.length - 1}
                    onDialog={setDialog}
                  />
                }
              />
            ))}
          </ul>
        )}

        <AddItemForm checklistId={checklist.id} isHabit={isHabit} listTitle={checklist.title} />
      </CardContent>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          {dialog?.kind === "edit-list" && (
            <EditListForm checklist={checklist} tracks={tracks} onDone={() => setDialog(null)} />
          )}
          {dialog?.kind === "delete-list" && (
            <ConfirmDelete
              title={`Delete “${checklist.title}”?`}
              description={`Its ${total} item${total === 1 ? "" : "s"}${isHabit ? " and their streaks" : ""} will be deleted too.`}
              id={checklist.id}
              action={deleteChecklistAction}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog?.kind === "edit-item" && (
            <EditItemForm
              key={dialog.item.id}
              checklistId={checklist.id}
              item={dialog.item}
              isHabit={isHabit}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog?.kind === "delete-item" && (
            <ConfirmDelete
              title={`Delete “${dialog.item.title}”?`}
              description={
                isHabit ? "Its streak history will be deleted too." : "This can't be undone."
              }
              id={dialog.item.id}
              action={deleteItemAction}
              onDone={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ItemMenu({
  item,
  isFirst,
  isLast,
  onDialog,
}: {
  item: ItemView;
  isFirst: boolean;
  isLast: boolean;
  onDialog: (d: DialogState) => void;
}) {
  const [, move] = useToastAction(moveItemAction);
  const [, startTransition] = useTransition();
  const doMove = (direction: "up" | "down") =>
    startTransition(() => {
      const fd = new FormData();
      fd.set("id", item.id);
      fd.set("direction", direction);
      move(fd);
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Actions for ${item.title}`}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onDialog({ kind: "edit-item", item })}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isFirst} onSelect={() => doMove("up")}>
          <ArrowUp />
          Move up
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLast} onSelect={() => doMove("down")}>
          <ArrowDown />
          Move down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDialog({ kind: "delete-item", item })}
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Inline "add item": title (+ due date for non-habits). Clears and keeps focus after adding. */
function AddItemForm({
  checklistId,
  isHabit,
  listTitle,
}: {
  checklistId: string;
  isHabit: boolean;
  listTitle: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useToastAction(saveItemAction, () => {
    formRef.current?.reset();
    formRef.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus();
  });
  const onSubmit = useNoResetSubmit(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-1">
      <input type="hidden" name="checklistId" value={checklistId} />
      <div className="flex gap-2">
        <Input
          name="title"
          required
          maxLength={200}
          placeholder={isHabit ? "New habit…" : "New item…"}
          aria-label={`New item in ${listTitle}`}
          aria-invalid={Boolean(state.fieldErrors?.title)}
        />
        {!isHabit && (
          <Input
            type="date"
            name="dueOn"
            className="w-36 shrink-0"
            aria-label="Due date (optional)"
          />
        )}
        <Button
          type="submit"
          variant="outline"
          size="icon"
          disabled={pending}
          aria-label={`Add to ${listTitle}`}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
        </Button>
      </div>
      {state.fieldErrors?.title && (
        <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
      )}
    </form>
  );
}

function EditItemForm({
  checklistId,
  item,
  isHabit,
  onDone,
}: {
  checklistId: string;
  item: ItemView;
  isHabit: boolean;
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(saveItemAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  const [priority, setPriority] = useState(String(item.priority));
  const err = state.fieldErrors;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit item</DialogTitle>
        <DialogDescription className="sr-only">
          Change the title, due date or priority.
        </DialogDescription>
      </DialogHeader>
      <input type="hidden" name="checklistId" value={checklistId} />
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="priority" value={priority} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-title">Title</Label>
        <Input
          id="item-title"
          name="title"
          required
          maxLength={200}
          defaultValue={item.title}
          aria-invalid={Boolean(err?.title)}
        />
        {err?.title && <p className="text-sm text-destructive">{err.title[0]}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {!isHabit && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-due">
              Due <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="item-due" name="dueOn" type="date" defaultValue={item.dueOn ?? ""} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-priority">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="item-priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_LABEL.map((label, i) => (
                <SelectItem key={label} value={String(i)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditListForm({
  checklist,
  tracks,
  onDone,
}: {
  checklist: ChecklistView;
  tracks: TrackChoice[];
  onDone: () => void;
}) {
  const [state, action, pending] = useToastAction(updateChecklistAction, onDone);
  const onSubmit = useNoResetSubmit(action);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit list</DialogTitle>
        <DialogDescription>
          The list type ({TYPE_LABEL[checklist.type].toLowerCase()}) can&apos;t be changed.
        </DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={checklist.id} />
      <ChecklistFormFields
        tracks={tracks}
        fieldErrors={state.fieldErrors}
        defaults={{
          title: checklist.title,
          description: checklist.description ?? "",
          trackId: checklist.track?.id ?? "",
        }}
      />
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

function ConfirmDelete({
  title,
  description,
  id,
  action: serverAction,
  onDone,
}: {
  title: string;
  description: string;
  id: string;
  action: typeof deleteItemAction;
  onDone: () => void;
}) {
  const [, action, pending] = useToastAction(serverAction, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <input type="hidden" name="id" value={id} />
      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />}
          Delete
        </Button>
      </DialogFooter>
    </form>
  );
}
