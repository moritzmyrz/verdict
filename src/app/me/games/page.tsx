import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

export default async function MyGamesPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const games = await api.history.listMyGames({ limit: 30 });

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl p-6 text-zinc-100">
      <h1 className="mb-4 text-2xl font-semibold">My games</h1>
      <ul className="space-y-3">
        {games.map((game) => (
          <li
            key={game.gameId}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 px-4 py-3"
          >
            <div>
              <p className="capitalize">
                {game.timeClass} - {game.result ?? "in progress"}
              </p>
              <p className="text-sm text-zinc-400">
                {Math.round(game.baseMs / 60000)}+{Math.round(game.incrementMs / 1000)} |{" "}
                {game.terminationReason ?? "active"}
              </p>
            </div>
            <Link href={`/game/${game.gameId}`} className="text-sm text-blue-400 hover:text-blue-300">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
