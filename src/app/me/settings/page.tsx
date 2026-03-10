import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const stats = await api.profile.getMyStats();

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl p-6 text-zinc-100">
      <h1 className="mb-4 text-2xl font-semibold">Profile settings</h1>
      <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
        <p className="text-sm text-zinc-400">Current profile</p>
        <p className="mt-2">Username: {stats.profile?.username ?? "Not set"}</p>
        <p className="text-sm text-zinc-400">Use tRPC `profile.upsert` from the client form next.</p>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900 p-4">
        <p className="mb-2 text-sm text-zinc-400">Ratings</p>
        <ul className="space-y-1 text-sm">
          {stats.ratings.map((rating) => (
            <li key={rating.id} className="capitalize">
              {rating.timeClass}: {rating.value}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
