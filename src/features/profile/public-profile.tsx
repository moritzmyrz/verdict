import Link from "next/link";

import { api } from "~/trpc/server";

type Props = {
  username: string;
};

export async function PublicProfile({ username }: Props) {
  const data = await api.profile.getPublic({ username });
  if (!data) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-zinc-100">
        <p>Profile not found.</p>
      </div>
    );
  }

  const totalStats = data.stats.reduce(
    (acc, stat) => {
      acc.wins += stat.wins;
      acc.losses += stat.losses;
      acc.draws += stat.draws;
      return acc;
    },
    { wins: 0, losses: 0, draws: 0 },
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6 text-zinc-100">
      <header className="rounded-xl border border-white/10 bg-zinc-900 p-4">
        <h1 className="text-2xl font-semibold">{data.profile.username}</h1>
        <p className="text-sm text-zinc-400">{data.profile.bio ?? "No bio yet."}</p>
        <p className="mt-2 text-sm text-zinc-300">
          W/L/D: {totalStats.wins}/{totalStats.losses}/{totalStats.draws}
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="mb-3 text-lg font-medium">Ratings</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.ratings.map((rating) => (
            <li key={rating.id} className="rounded-md border border-white/10 px-3 py-2 text-sm">
              <span className="capitalize">{rating.timeClass}</span>: {rating.value}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="mb-3 text-lg font-medium">Recent games</h2>
        <ul className="space-y-2">
          {data.recentGames.map((game) => (
            <li
              key={game.gameId}
              className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm"
            >
              <div>
                <p className="capitalize">
                  {game.timeClass} - {game.result ?? "pending"}
                </p>
                <p className="text-zinc-400">{game.terminationReason ?? "in progress"}</p>
              </div>
              <Link href={`/game/${game.gameId}`} className="text-blue-400 hover:text-blue-300">
                View
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
