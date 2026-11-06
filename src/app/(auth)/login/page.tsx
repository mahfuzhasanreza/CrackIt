import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Brand } from "@/components/app-shell/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentUser } from "@/modules/auth/dal";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <Brand />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Log in</h1>
          </CardTitle>
          <CardDescription>Welcome back. Keep the streak going.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* useSearchParams reads the request → needs a Suspense boundary */}
          <Suspense fallback={<Skeleton className="h-52 w-full" />}>
            <LoginForm />
          </Suspense>
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/register"
              className="font-medium text-foreground underline underline-offset-2"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

/** Already signed in with a *valid* session (checked by the DAL, not just the JWT)? Skip login. */
async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return null;
}
