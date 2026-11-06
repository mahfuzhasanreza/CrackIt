"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, type LoginState } from "../actions";

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "";
  const passwordChanged = params.get("password") === "changed";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {passwordChanged && !state.error && (
        <Alert role="status">
          <CircleCheck />
          <AlertDescription>Password changed. Log in with your new one.</AlertDescription>
        </Alert>
      )}
      {state.error && (
        <Alert variant="destructive" role="alert">
          <CircleAlert />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          autoFocus
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
        {state.fieldErrors?.email && (
          <p id="email-error" className="text-sm text-destructive">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
        />
        {state.fieldErrors?.password && (
          <p id="password-error" className="text-sm text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />}
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
