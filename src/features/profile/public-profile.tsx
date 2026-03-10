import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/server";

type Props = {
  username: string;
};

export async function PublicProfile({ username }: Props) {
  const data = await api.profile.getPublic({ username });
  if (!data) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Profile not found.</CardContent>
        </Card>
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
  const totalGames = totalStats.wins + totalStats.losses + totalStats.draws;
  const winRate = totalGames > 0 ? Math.round((totalStats.wins / totalGames) * 100) : 0;
  const ratingsByClass = [...data.ratings].sort((a, b) => a.timeClass.localeCompare(b.timeClass));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-2xl">{data.profile.username}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{totalGames} games</Badge>
              <Badge variant="secondary">Win rate {winRate}%</Badge>
            </div>
          </div>
          <CardDescription>{data.profile.bio ?? "No bio yet."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Wins</p>
            <p className="text-xl font-semibold">{totalStats.wins}</p>
          </div>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Losses</p>
            <p className="text-xl font-semibold">{totalStats.losses}</p>
          </div>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Draws</p>
            <p className="text-xl font-semibold">{totalStats.draws}</p>
          </div>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Games played</p>
            <p className="text-xl font-semibold">{totalGames}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ratings by time control</CardTitle>
          </CardHeader>
          <CardContent>
            {ratingsByClass.length > 0 ? (
              <ul className="space-y-2">
                {ratingsByClass.map((rating) => (
                  <li
                    key={rating.id}
                    className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                  >
                    <span className="text-sm capitalize text-muted-foreground">{rating.timeClass}</span>
                    <div className="text-right">
                      <p className="font-mono text-lg font-semibold tabular-nums">{rating.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {rating.gamesPlayed} games {rating.provisional ? "· provisional" : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No ratings yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent games</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentGames.length > 0 ? (
              <ul className="space-y-2">
                {data.recentGames.map((game) => (
                  <li
                    key={game.gameId}
                    className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium capitalize">
                        {game.timeClass} · {game.rated ? "Rated" : "Casual"}
                      </p>
                      <p className="text-muted-foreground">
                        {game.result ?? "in progress"} · {game.terminationReason ?? "active"}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/game/${game.gameId}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No recent games yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
