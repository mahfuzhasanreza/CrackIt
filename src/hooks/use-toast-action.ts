"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { type ActionState, initialActionState } from "@/lib/action-state";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * `useActionState` that toasts (and calls `onSuccess`) as soon as the action returns, inside the
 * transition. Unlike an effect, this still fires when the component unmounts because of the
 * mutation itself, e.g. a revised entry leaving the due list or a deleted entry's card.
 */
export function useToastAction(action: Action, onSuccess?: () => void) {
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });
  return useActionState<ActionState, FormData>(async (prev, formData) => {
    const state = await action(prev, formData);
    if (state.status === "success") {
      if (state.message) toast.success(state.message);
      onSuccessRef.current?.();
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
    return state;
  }, initialActionState);
}
