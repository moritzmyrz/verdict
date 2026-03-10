import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInButton } from "~/features/auth/sign-in-button";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
        <header className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 px-4 py-3">
          <h1 className="text-xl font-semibold">Verdict</h1>
          {!session ? (
            <SignInButton />
          ) : (
            <form className="flex items-center gap-2">
              <span className="text-sm text-zinc-300">{session.user?.name}</span>
              <button
                className="rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
                formAction={async () => {
                  "use server";
                  await auth.api.signOut({
                    headers: await headers(),
                  });
                  redirect("/");
                }}
              >
                Sign out
              </button>
            </form>
          )}
        </header>

        <section className="rounded-xl border border-white/10 bg-zinc-900 p-8">
          <p className="mb-2 text-sm uppercase tracking-wide text-zinc-400">
            Competitive chess platform
          </p>
          <h2 className="text-4xl font-semibold">Play fast, track progress, build your profile.</h2>
          <p className="mt-4 max-w-2xl text-zinc-300">
            Verdict is a profile-first multiplayer chess platform with timed games, rating progression,
            match history, and practical production architecture.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/play" className="rounded-md bg-blue-700 px-4 py-2 text-sm hover:bg-blue-600">
              Play now
            </Link>
            <Link href="/me/games" className="rounded-md bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">
              Match history
            </Link>
            <Link
              href="/me/settings"
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
            >
              Profile settings
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Timed multiplayer</p>
            <p className="mt-2 text-sm text-zinc-200">
              Authoritative clocks and legal move validation.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Meaningful profiles</p>
            <p className="mt-2 text-sm text-zinc-200">
              Ratings per time class with visible game history.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Portfolio-grade architecture</p>
            <p className="mt-2 text-sm text-zinc-200">
              Next.js + TypeScript + tRPC + Drizzle + Better Auth.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
