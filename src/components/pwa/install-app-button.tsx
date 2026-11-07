"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import { promptInstall, useCanInstall } from "./install-prompt";

/**
 * "Install app" at the bottom of the sidebar. Rendered only when the browser offers
 * installation and CrackIt isn't installed yet; otherwise nothing (no empty footer).
 */
export function InstallAppButton({ onDone }: { onDone?: () => void }) {
  const canInstall = useCanInstall();
  if (!canInstall) return null;
  return (
    <div className="shrink-0 p-3">
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={async () => {
          await promptInstall();
          onDone?.();
        }}
      >
        <Download />
        Install app
      </Button>
    </div>
  );
}
