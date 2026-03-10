import { redirect } from "next/navigation";

import { PlayClient } from "~/features/play/play-client";
import { getSession } from "~/server/better-auth/server";

export default async function PlayPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  return <PlayClient />;
}
