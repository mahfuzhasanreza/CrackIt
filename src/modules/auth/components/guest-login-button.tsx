"use client";

import { CircleAlert, LoaderCircle, UserRound } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { guestLoginAction, type GuestState } from "../actions";

/** "Continue as guest": a throwaway account with demo data, in the visitor's time zone. */
export function GuestLoginButton() {
  const [state, formAction, pending] = useActionState<GuestState, FormData>(guestLoginAction, {});

  return (
    <form
      action={(formData) => {
        formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
        formAction(formData);
      }}
      className="flex flex-col gap-2"
    >
      {state.error && (
        <Alert variant="destructive" role="alert">
          <CircleAlert />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : <UserRound />}
        {pending ? "Setting up a demo account…" : "Continue as guest"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Guest accounts are deleted after 24 hours.
      </p>
    </form>
  );
}
