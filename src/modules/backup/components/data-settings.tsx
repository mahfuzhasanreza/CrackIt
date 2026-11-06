"use client";

import { Download, FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { TABLE_LABEL, TABLES, type TableKey } from "../spec";

type Pending = { file: string; text: string; exportedAt: string; counts: [TableKey, number][] };

const CSV = [
  { kind: "time-entries", label: "Time entries" },
  { kind: "problems", label: "Problems" },
  { kind: "applications", label: "Applications" },
] as const;

/** Peek at a backup in the browser so the confirm dialog can say what will be restored. */
function summarize(text: string): Omit<Pending, "file" | "text"> {
  const json: unknown = JSON.parse(text);
  if (typeof json !== "object" || json === null || (json as { app?: unknown }).app !== "crackit") {
    throw new Error("This isn't a CrackIt backup.");
  }
  const { exportedAt, tables } = json as { exportedAt?: string; tables?: Record<string, unknown> };
  const counts = TABLES.map(
    (t) =>
      [t.key, Array.isArray(tables?.[t.key]) ? (tables[t.key] as unknown[]).length : 0] as [
        TableKey,
        number,
      ],
  ).filter(([, n]) => n > 0);
  return { exportedAt: exportedAt ?? "unknown", counts };
}

export function DataSettings() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setPending({ file: file.name, text, ...summarize(text) });
    } catch (error) {
      toast.error(
        error instanceof SyntaxError
          ? "That file isn't valid JSON."
          : String((error as Error).message),
      );
    }
  };

  const restore = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: pending.text,
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Restore failed.");
        return;
      }
      toast.success("Backup restored");
      setPending(null);
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server. Your data is unchanged.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Export</h2>
          </CardTitle>
          <CardDescription>
            A full JSON backup restores everything (it&apos;s the format Restore reads). CSVs are
            for spreadsheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="/api/backup" download>
              <Download />
              Download backup (JSON)
            </a>
          </Button>
          {CSV.map((c) => (
            <Button key={c.kind} asChild variant="outline">
              <a href={`/api/export/${c.kind}`} download>
                <Download />
                {c.label} (CSV)
              </a>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Restore from a backup</h2>
          </CardTitle>
          <CardDescription>
            Replaces <strong>all</strong> your current data with the backup&apos;s. Download a
            backup first if you might want today&apos;s data back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Backup file"
            onChange={onFile}
          />
          <Button variant="outline" onClick={() => input.current?.click()}>
            <FileUp />
            Choose backup file…
          </Button>
        </CardContent>
      </Card>

      <Dialog open={pending !== null} onOpenChange={(o) => !o && !busy && setPending(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Replace all your data?</DialogTitle>
            <DialogDescription>
              {pending?.file} · exported {pending?.exportedAt.slice(0, 10)}. Everything you have now
              is deleted and replaced with:
            </DialogDescription>
          </DialogHeader>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {pending?.counts.map(([key, n]) => (
              <li key={key} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{TABLE_LABEL[key]}</span>
                <span className="tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={restore}>
              {busy && <LoaderCircle className="animate-spin" />}
              Replace my data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
