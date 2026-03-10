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
    <div className="mx-auto min-h-screen w-full max-w-6xl space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">My games</h1>
      {games.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You have not played any games yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {games.map((game) => (
            <li key={game.gameId}>
              <Card className="border-border/70">
                <CardHeader className="flex flex-row items-center justify-between gap-4 py-4">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base">
                      {game.opponentName ?? "Opponent"} ·{" "}
                      <span className="capitalize text-muted-foreground">{game.myColor}</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground capitalize">
                      {game.timeClass} · {Math.round(game.baseMs / 60000)}+{Math.round(game.incrementMs / 1000)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={game.rated ? "default" : "secondary"}>
                      {game.rated ? "Rated" : "Casual"}
                    </Badge>
                    <Badge variant="outline">{game.terminationReason ?? "active"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <p className="text-sm capitalize text-muted-foreground">
                    Result: {game.result ?? "in progress"}
                  </p>
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
