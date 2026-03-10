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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{data.profile.username}</CardTitle>
          <CardDescription>{data.profile.bio ?? "No bio yet."}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          W/L/D: {totalStats.wins}/{totalStats.losses}/{totalStats.draws}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {data.ratings.map((rating) => (
              <li key={rating.id}>
                <Badge variant="secondary" className="capitalize">
                  {rating.timeClass}: {rating.value}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent games</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.recentGames.map((game) => (
              <li
                key={game.gameId}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="capitalize">
                    {game.timeClass} - {game.result ?? "pending"}
                  </p>
                  <p className="text-muted-foreground">{game.terminationReason ?? "in progress"}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/game/${game.gameId}`}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
