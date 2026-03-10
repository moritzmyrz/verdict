import { notFound, redirect } from "next/navigation";

import { GameClient } from "~/features/game/game-client";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

type Props = {
  params: Promise<{ gameId: string }>;
};

export default async function GamePage({ params }: Props) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const { gameId } = await params;
  const game = await api.game.getById({ gameId });
  if (!game) {
    notFound();
  }

  return <GameClient gameId={gameId} currentUserId={session.user.id} />;
}
