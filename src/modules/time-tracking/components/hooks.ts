"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/action-state";

/** Current time, ticking every `intervalMs`. Starts at `initial` so SSR and hydration match. */
export function useNow(initial: Date, intervalMs = 1000): Date {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Toast once per submission; call `onSuccess` after a successful one. */
export function useActionFeedback(state: ActionState, onSuccess?: () => void) {
  const seen = useRef(state.submittedAt);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });
  useEffect(() => {
    if (!state.submittedAt || state.submittedAt === seen.current) return;
    seen.current = state.submittedAt;
    if (state.status === "success") {
      if (state.message) toast.success(state.message);
      onSuccessRef.current?.();
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state]);
}

/**
 * Submit a form to a `useActionState` action WITHOUT React 19's automatic form reset,
 * so the user's input survives validation errors. (Radix Selects would otherwise reset too.)
 */
export function useNoResetSubmit(action: (formData: FormData) => void) {
  const [, startTransition] = useTransition();
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
