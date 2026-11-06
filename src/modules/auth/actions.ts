"use server";

import { headers } from "next/headers";
import { AuthError, CredentialsSignin } from "next-auth";

import { signIn, signOut } from "@/auth";

import { registerUser } from "./registration";
import { loginSchema, registerSchema, safeRedirectPath } from "./validators";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
  email?: string;
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { fieldErrors, email };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeRedirectPath(formData.get("callbackUrl"), await requestOrigin()),
    });
    return {}; // unreachable: signIn redirects on success
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return { error: "Too many failed attempts. Try again in 15 minutes.", email };
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password.", email };
    }
    throw error; // includes the redirect thrown by a successful signIn
  }
}

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password" | "confirmPassword", string[]>>;
  values?: { name: string; email: string };
};

/** Open sign-up: create the account, then sign straight in. */
export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = registerSchema.safeParse({
    ...values,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };

  const result = await registerUser(parsed.data, await requestIp());
  if (!result.ok) {
    return { error: result.error.message, fieldErrors: result.error.fieldErrors, values };
  }
  // Throws the redirect to the dashboard.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });
  return {};
}

async function requestIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
