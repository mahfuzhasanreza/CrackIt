import { Target } from "lucide-react";
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Target className="size-4" aria-hidden />
      </span>
      CrackIt
    </Link>
  );
}
