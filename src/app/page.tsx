import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { AuthPanel } from "~/features/auth/auth-panel";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <header className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
          <h1 className="text-xl font-semibold">Verdict</h1>
          {session ? (
            <form className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{session.user?.name}</span>
              <Button
                type="submit"
                variant="outline"
                formAction={async () => {
                  "use server";
                  await auth.api.signOut({
                    headers: await headers(),
                  });
                  redirect("/");
                }}
              >
                Sign out
              </Button>
            </form>
          ) : null}
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                Competitive chess platform
              </p>
              <CardTitle className="text-4xl">Play fast, track progress, build your profile.</CardTitle>
              <CardDescription className="max-w-2xl pt-2 text-base">
                Verdict is a profile-first multiplayer chess platform with timed games, rating
                progression, match history, and practical production architecture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/play">Play now</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/me/games">Match history</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/me/settings">Profile settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          {!session ? <AuthPanel /> : null}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Timed multiplayer</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Authoritative clocks and legal move validation.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Meaningful profiles</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Ratings per time class with visible game history.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Portfolio-grade architecture</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Next.js + TypeScript + tRPC + Drizzle + Better Auth.
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
