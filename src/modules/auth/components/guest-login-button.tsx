"use client";

import { LoaderCircle, UserRound } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

import { guestLoginAction } from "../actions";

/** "Continue as guest": sign into the shared demo account. */
export function GuestLoginButton() {
  return (
    <form action={guestLoginAction} className="flex flex-col gap-2">
      <SubmitButton />
      <p className="text-center text-xs text-muted-foreground">
        No sign-up: explore a shared account with demo data.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <UserRound />}
      {pending ? "Signing in…" : "Continue as guest"}
    </Button>
  );
}
