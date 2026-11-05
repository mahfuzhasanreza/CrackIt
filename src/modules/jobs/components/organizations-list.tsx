"use client";

import { Ellipsis, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ORG_TYPE_LABEL } from "../labels";

import { DeleteJobForm, OrganizationForm, type OrganizationDefaults } from "./job-forms";

type Org = OrganizationDefaults & { applicationCount: number };

export function OrganizationsList({ organizations }: { organizations: Org[] }) {
  const [dialog, setDialog] = useState<{ kind: "edit" | "delete"; org: Org } | null>(null);
  if (organizations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Organizations are created when you add an application.
      </p>
    );
  }
  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {organizations.map((o) => (
          <li key={o.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium">{o.name}</h2>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant="outline">{ORG_TYPE_LABEL[o.type]}</Badge>
                  {o.location && <span>{o.location}</span>}
                  <span>
                    {o.applicationCount} application{o.applicationCount === 1 ? "" : "s"}
                  </span>
                  {o.website && (
                    <a
                      href={o.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      Website <ExternalLink className="size-3" aria-hidden />
                    </a>
                  )}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Actions for ${o.name}`}
                  >
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", org: o })}>
                    <Pencil />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDialog({ kind: "delete", org: o })}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {o.notesMd.trim() && <Markdown>{o.notesMd}</Markdown>}
          </li>
        ))}
      </ul>
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {dialog?.kind === "edit" && (
            <OrganizationForm
              key={dialog.org.id}
              organization={dialog.org}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog?.kind === "delete" && (
            <DeleteJobForm
              kind="organization"
              id={dialog.org.id}
              label={dialog.org.name}
              note={
                dialog.org.applicationCount
                  ? `Its ${dialog.org.applicationCount} application${dialog.org.applicationCount === 1 ? "" : "s"} and their interviews are deleted too.`
                  : undefined
              }
              onDone={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
