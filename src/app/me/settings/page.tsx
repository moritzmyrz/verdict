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

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Profile settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current profile</CardTitle>
          <CardDescription>Profile editing will be wired to `profile.upsert` next.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Username: {stats.profile?.username ?? "Not set"}</p>
          <p className="text-muted-foreground">Bio: {stats.profile?.bio ?? "No bio yet."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.ratings.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {stats.ratings.map((rating) => (
                <li key={rating.id}>
                  <Badge variant="secondary" className="capitalize">
                    {rating.timeClass}: {rating.value}
                  </Badge>
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
