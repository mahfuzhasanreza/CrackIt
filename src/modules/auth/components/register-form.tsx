"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { registerAction, type RegisterState } from "../actions";
import { PASSWORD_MIN_LENGTH } from "../validators";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, {});
  const err = state.fieldErrors;
  const describe = (id: string, field: keyof NonNullable<typeof err>) =>
    err?.[field] ? `${id}-error` : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && (
        <Alert variant="destructive" role="alert">
          <CircleAlert />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <FormField id="register-name" label="Name" optional error={err?.name}>
        <Input
          id="register-name"
          name="name"
          autoComplete="name"
          maxLength={80}
          defaultValue={state.values?.name}
          autoFocus
        />
      </FormField>
      <FormField id="register-email" label="Email" error={err?.email}>
        <Input
          id="register-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.values?.email}
          aria-invalid={Boolean(err?.email)}
          aria-describedby={describe("register-email", "email")}
        />
      </FormField>
      <FormField id="register-password" label="Password" error={err?.password}>
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          aria-invalid={Boolean(err?.password)}
          aria-describedby={describe("register-password", "password") ?? "register-password-hint"}
        />
        {!err?.password && (
          <p id="register-password-hint" className="text-xs text-muted-foreground">
            At least {PASSWORD_MIN_LENGTH} characters.
          </p>
        )}
      </FormField>
      <FormField id="register-confirm" label="Repeat password" error={err?.confirmPassword}>
        <Input
          id="register-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(err?.confirmPassword)}
          aria-describedby={describe("register-confirm", "confirmPassword")}
        />
      </FormField>

      <Button type="submit" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />}
        {pending ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}
