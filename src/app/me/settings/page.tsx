import { redirect } from "next/navigation";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const stats = await api.profile.getMyStats();
  const totalStats = stats.stats.reduce(
    (acc, item) => {
      acc.wins += item.wins;
      acc.losses += item.losses;
      acc.draws += item.draws;
      acc.bestStreak = Math.max(acc.bestStreak, item.bestStreak);
      acc.currentStreak = Math.max(acc.currentStreak, item.currentStreak);
      return acc;
    },
    { wins: 0, losses: 0, draws: 0, bestStreak: 0, currentStreak: 0 },
  );
  const totalGames = totalStats.wins + totalStats.losses + totalStats.draws;

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identity</CardTitle>
          <CardDescription>Your public chess identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Username: {stats.profile?.username ?? "Not set"}</p>
          <p className="text-muted-foreground">Bio: {stats.profile?.bio ?? "No bio yet."}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">Games: {totalGames}</Badge>
            <Badge variant="outline">Current streak: {totalStats.currentStreak}</Badge>
            <Badge variant="outline">Best streak: {totalStats.bestStreak}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.ratings.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {stats.ratings.map((rating) => (
                <li
                  key={rating.id}
                  className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                >
                  <div>
                    <p className="text-sm capitalize text-muted-foreground">{rating.timeClass}</p>
                    <p className="text-xs text-muted-foreground">
                      {rating.gamesPlayed} games {rating.provisional ? "· provisional" : ""}
                    </p>
                  </div>
                  <p className="font-mono text-xl font-semibold tabular-nums">{rating.value}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No ratings yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
