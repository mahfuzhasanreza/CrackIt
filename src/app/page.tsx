import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tracks = [
  { name: "SWE / Full-Stack", detail: "DSA, system design, React/Next.js, backend" },
  { name: "University Lecturer", detail: "Teaching demos, subject depth, research, viva" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">CrackIt</h1>
        <p className="text-muted-foreground">
          Track every hour of interview prep: study, gaps, sleep, what you learned, and every
          application.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2">
        {tracks.map((t) => (
          <Card key={t.name}>
            <CardHeader>
              <CardTitle>{t.name}</CardTitle>
              <CardDescription>{t.detail}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Coming soon.</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
