import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Brand } from "@/components/app-shell/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/modules/auth/components/register-form";
import { getCurrentUser } from "@/modules/auth/dal";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <Brand />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>Create an account</h1>
          </CardTitle>
          <CardDescription>
            You start with SWE and lecturer tracks, a topic roadmap and activity types — edit them
            any time in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RegisterForm />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-2"
            >
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
  return null;
}
