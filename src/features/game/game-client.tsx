"use client";

import { Chess } from "chess.js";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { getTrpcErrorMessage } from "~/lib/trpc-error-message";
import { api } from "~/trpc/react";
import { Chessboard } from "./chessboard";

type Props = {
  gameId: string;
  currentUserId: string;
};

function toClockLabel(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPlayerLabel(player: {
  displayName?: string;
  userId?: string;
  rating?: number | null;
} | null) {
  if (!player) {
    return "Waiting for opponent";
  }

  const name = player.displayName ?? player.userId ?? "Player";
  const rating = player.rating ?? 1200;
  return `${name} (${rating})`;
}

export function GameClient({ gameId, currentUserId }: Props) {
  const utils = api.useUtils();
  const [actionError, setActionError] = useState<string | null>(null);
  const gameQuery = api.game.getById.useQuery(
    { gameId },
    {
      refetchInterval: 2000,
      retry: 1,
    },
  );

  const [optimisticFen, setOptimisticFen] = useState<string | null>(null);

  const submitMove = api.game.submitMove.useMutation({
    onSuccess: async () => {
      setActionError(null);
      setOptimisticFen(null);
      await utils.game.getById.invalidate({ gameId });
      await utils.history.listMyGames.invalidate();
      await utils.profile.getMyStats.invalidate();
    },
    onError: (error) => {
      setActionError(getTrpcErrorMessage(error, "Move rejected. Please try again."));
      setOptimisticFen(null);
    },
  });

  const resign = api.game.resign.useMutation({
    onSuccess: async () => {
      setActionError(null);
      await utils.game.getById.invalidate({ gameId });
      await utils.history.listMyGames.invalidate();
      await utils.profile.getMyStats.invalidate();
    },
    onError: (error) => {
      setActionError(getTrpcErrorMessage(error, "Could not resign right now."));
    },
  });

  const drawOffer = api.game.offerDraw.useMutation({
    onSuccess: async () => {
      setActionError(null);
      await utils.game.getById.invalidate({ gameId });
    },
    onError: (error) => {
      setActionError(getTrpcErrorMessage(error, "Could not send draw offer."));
    },
  });

  const drawResponse = api.game.respondDraw.useMutation({
    onSuccess: async () => {
      setActionError(null);
      await utils.game.getById.invalidate({ gameId });
      await utils.history.listMyGames.invalidate();
      await utils.profile.getMyStats.invalidate();
    },
    onError: (error) => {
      setActionError(getTrpcErrorMessage(error, "Could not respond to draw offer."));
    },
  });

  const rematch = api.game.requestRematch.useMutation({
    onError: (error) => {
      setActionError(getTrpcErrorMessage(error, "Could not request rematch."));
    },
  });

  const gameData = gameQuery.data;
  const game = gameData?.game;
  const participants = gameData?.participants ?? [];
  const me = participants.find((participant) => participant.userId === currentUserId);
  const white = participants.find((participant) => participant.color === "white");
  const black = participants.find((participant) => participant.color === "black");
  const canMove = !!me && game?.status === "active" && game.turnColor === me.color;
  const orientation = me?.color ?? "white";
  const currentTurnLabel =
    game?.turnColor === "white" ? formatPlayerLabel(white ?? null) : formatPlayerLabel(black ?? null);

  const currentFen = optimisticFen ?? game?.currentFen ?? new Chess().fen();
  const chess = new Chess(currentFen);
  const inCheck = chess.inCheck();
  const checkedColor = inCheck ? (chess.turn() === "w" ? "white" : "black") : null;
  const checkedPlayer = checkedColor === "white" ? white : checkedColor === "black" ? black : null;

  const drawOfferedByOther =
    !!game?.drawOfferedByUserId && game.drawOfferedByUserId !== currentUserId;
  const fullMoveRows = [];
  if (gameData?.moves) {
    for (let i = 0; i < gameData.moves.length; i += 2) {
      const whiteMove = gameData.moves[i];
      const blackMove = gameData.moves[i + 1];
      fullMoveRows.push({
        number: Math.floor(i / 2) + 1,
        white: whiteMove?.san ?? "-",
        black: blackMove?.san ?? "-",
        key: `${whiteMove?.id ?? i}-${blackMove?.id ?? i + 1}`,
      });
    }
  }
  const firstMoveGraceEndsAt = gameData?.firstMoveClockStartsAt
    ? new Date(gameData.firstMoveClockStartsAt)
    : null;
  const firstMoveGraceActive =
    firstMoveGraceEndsAt &&
    gameData?.moves.length === 0 &&
    game?.status === "active" &&
    firstMoveGraceEndsAt.getTime() > Date.now();

  if (gameQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  if (gameQuery.error) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
        <Alert variant="destructive">
          <AlertTitle>Could not load game</AlertTitle>
          <AlertDescription>
            {getTrpcErrorMessage(gameQuery.error, "Please refresh and try again.")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <Badge variant={orientation === "white" ? "default" : "secondary"}>
            You are {orientation}
          </Badge>
          <Badge variant="outline">Turn: {currentTurnLabel}</Badge>
          {firstMoveGraceActive ? (
            <Badge variant="secondary">First-move grace running (30s)</Badge>
          ) : null}
          {inCheck ? (
            <Badge variant="destructive">Check on {formatPlayerLabel(checkedPlayer ?? null)}</Badge>
          ) : null}
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Black</p>
                <p className="font-medium">{formatPlayerLabel(black ?? null)}</p>
              </div>
              <p className="text-lg font-semibold">
                {toClockLabel(black?.remainingMsLive ?? game?.baseMs ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Chessboard
            fen={currentFen}
            canMove={canMove}
            orientation={orientation}
            onMove={({ from, to, promotion }) => {
              const localChess = new Chess(currentFen);
              const result = localChess.move({ from, to, promotion });
              if (!result) return;
              setActionError(null);
              setOptimisticFen(localChess.fen());
              submitMove.mutate({ gameId, from, to, promotion });
            }}
          />

          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">White</p>
                <p className="font-medium">{formatPlayerLabel(white ?? null)}</p>
              </div>
              <p className="text-lg font-semibold">
                {toClockLabel(white?.remainingMsLive ?? game?.baseMs ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{game?.status ?? "Loading"}</p>
              {game?.terminationReason ? (
                <Badge variant="secondary">{game.terminationReason}</Badge>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time control</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">
                {Math.round((game?.baseMs ?? 0) / 60000)}+{Math.round((game?.incrementMs ?? 0) / 1000)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-wrap gap-2 p-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => resign.mutate({ gameId })}
                  disabled={resign.isPending || game?.status !== "active"}
                >
                  Resign
                </Button>
                <Button
                  type="button"
                  onClick={() => drawOffer.mutate({ gameId })}
                  disabled={drawOffer.isPending || game?.status !== "active"}
                >
                  Offer draw
                </Button>
                {drawOfferedByOther ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => drawResponse.mutate({ gameId, accept: true })}
                    >
                      Accept draw
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => drawResponse.mutate({ gameId, accept: false })}
                    >
                      Decline draw
                    </Button>
                  </>
                ) : null}
                {game?.status === "finished" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => rematch.mutate({ gameId })}
                    disabled={rematch.isPending}
                  >
                    Request rematch
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Moves</CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              {fullMoveRows.length > 0 ? (
                <ol className="space-y-1 text-sm">
                  {fullMoveRows.map((row) => (
                    <li key={row.key} className="grid grid-cols-[2rem_1fr_1fr] gap-2">
                      <span className="text-muted-foreground">{row.number}:</span>
                      <span>{row.white}</span>
                      <span>{row.black}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No moves yet.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
