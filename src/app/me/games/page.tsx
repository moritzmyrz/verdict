import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

export default async function MyGamesPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const games = await api.history.listMyGames({ limit: 30 });

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">My games</h1>
      {games.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You have not played any games yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {games.map((game) => (
            <li key={game.gameId}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base capitalize">
                      {game.timeClass} - {game.result ?? "in progress"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(game.baseMs / 60000)}+{Math.round(game.incrementMs / 1000)}
                    </p>
                  </div>
                  <Badge variant="outline">{game.terminationReason ?? "active"}</Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/game/${game.gameId}`}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
