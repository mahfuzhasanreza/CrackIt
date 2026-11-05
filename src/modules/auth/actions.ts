"use server";

import { headers } from "next/headers";
import { AuthError, CredentialsSignin } from "next-auth";

import { signIn, signOut } from "@/auth";

import { loginSchema, safeRedirectPath } from "./validators";

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

async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
