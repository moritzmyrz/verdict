"use client";

import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { getTrpcErrorMessage } from "~/lib/trpc-error-message";
import { api } from "~/trpc/react";
import { Chessboard } from "./chessboard";
import { GameActionsCard } from "./components/game-actions-card";
import { GameMetaCard } from "./components/game-meta-card";
import { MoveListCard } from "./components/move-list-card";
import { PlayerPanel } from "./components/player-panel";
import { deriveGameViewModel, formatPlayerIdentity, type PlayerColor } from "./view-model";

type Props = {
  gameId: string;
  currentUserId: string;
};

function millisecondsThreshold(baseMs: number) {
  if (baseMs <= 60_000) return 20_000;
  if (baseMs <= 180_000) return 30_000;
  if (baseMs <= 600_000) return 60_000;
  return 90_000;
}

function toClockLabel(ms: number, baseMs: number) {
  const clampedMs = Math.max(ms, 0);
  const thresholdMs = millisecondsThreshold(baseMs);
  const seconds = Math.floor(clampedMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  if (clampedMs >= thresholdMs) {
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const tenths = Math.floor((clampedMs % 1000) / 100);
  return `${m}:${s.toString().padStart(2, "0")}.${tenths}`;
}

function lowTimeThresholdMs(baseMs: number) {
  return Math.min(Math.max(Math.round(baseMs * 0.12), 8_000), 20_000);
}

function toTimeControlLabel(baseMs: number, incrementMs: number) {
  return `${Math.round(baseMs / 60_000)}+${Math.round(incrementMs / 1_000)}`;
}

function toTerminationLabel(reason: string | null | undefined) {
  if (!reason) return null;
  const labelMap: Record<string, string> = {
    checkmate: "Checkmate",
    resignation: "Resignation",
    timeout: "Timeout",
    draw_agreement: "Draw agreed",
    stalemate: "Stalemate",
    threefold: "Threefold repetition",
    fifty_move: "Fifty-move rule",
    aborted: "Aborted",
  };
  return labelMap[reason] ?? reason;
}

const STARTING_COUNTS = {
  white: { q: 1, r: 2, b: 2, n: 2, p: 8 },
  black: { q: 1, r: 2, b: 2, n: 2, p: 8 },
} as const;

function getCapturedMaterial(fen: string) {
  const chess = new Chess(fen);
  const remaining = {
    white: { q: 0, r: 0, b: 0, n: 0, p: 0 },
    black: { q: 0, r: 0, b: 0, n: 0, p: 0 },
  };

  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.type === "k") continue;
      if (piece.color === "w") remaining.white[piece.type] += 1;
      if (piece.color === "b") remaining.black[piece.type] += 1;
    }
  }

  const whiteCaptured = (Object.keys(STARTING_COUNTS.black) as Array<keyof typeof STARTING_COUNTS.black>)
    .map((piece) => ({
      piece,
      count: STARTING_COUNTS.black[piece] - remaining.black[piece],
    }))
    .filter((item) => item.count > 0);

  const blackCaptured = (Object.keys(STARTING_COUNTS.white) as Array<keyof typeof STARTING_COUNTS.white>)
    .map((piece) => ({
      piece,
      count: STARTING_COUNTS.white[piece] - remaining.white[piece],
    }))
    .filter((item) => item.count > 0);

  return {
    whiteCaptured,
    blackCaptured,
  };
}

export function GameClient({ gameId, currentUserId }: Props) {
  const utils = api.useUtils();
  const [actionError, setActionError] = useState<string | null>(null);
  const [clientNowMs, setClientNowMs] = useState(() => Date.now());
  const gameQuery = api.game.getById.useQuery(
    { gameId },
    {
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return 2000;
        return data.game.status === "active" ? 5000 : 15000;
      },
      retry: 1,
    },
  );

  const [optimisticFen, setOptimisticFen] = useState<string | null>(null);
  const [spectatorOrientation, setSpectatorOrientation] = useState<PlayerColor>("white");

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
  const view = deriveGameViewModel({
    participants,
    currentUserId,
    spectatorOrientation,
  });
  const white = participants.find((participant) => participant.color === "white");
  const black = participants.find((participant) => participant.color === "black");
  const canMove =
    view.isParticipant &&
    game?.status === "active" &&
    game.turnColor === (view.viewerRole === "spectator" ? undefined : view.viewerRole);

  const currentFen = optimisticFen ?? game?.currentFen ?? new Chess().fen();
  const capturedMaterial = useMemo(() => getCapturedMaterial(currentFen), [currentFen]);
  const timeControlLabel = toTimeControlLabel(game?.baseMs ?? 0, game?.incrementMs ?? 0);
  const chess = new Chess(currentFen);
  const inCheck = chess.inCheck();
  const checkedColor = inCheck ? (chess.turn() === "w" ? "white" : "black") : null;

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
  const firstMoveGraceEndsAt = useMemo(
    () => (gameData?.firstMoveClockStartsAt ? new Date(gameData.firstMoveClockStartsAt) : null),
    [gameData?.firstMoveClockStartsAt],
  );
  const firstMoveGraceActive =
    firstMoveGraceEndsAt &&
    gameData?.moves.length === 0 &&
    game?.status === "active" &&
    firstMoveGraceEndsAt.getTime() > clientNowMs;
  const firstMoveGraceRemainingMs =
    firstMoveGraceEndsAt && gameData?.moves.length === 0
      ? Math.max(firstMoveGraceEndsAt.getTime() - clientNowMs, 0)
      : 0;
  const latestMove = gameData?.moves.at(-1);
  const lastMove =
    latestMove?.uci && latestMove.uci.length >= 4
      ? { from: latestMove.uci.slice(0, 2), to: latestMove.uci.slice(2, 4) }
      : null;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClientNowMs(Date.now());
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  const effectiveBlackMs = useMemo(() => {
    if (!black) return game?.baseMs ?? 0;
    const baseline = black.remainingMsLive ?? game?.baseMs ?? 0;
    if (game?.status !== "active" || game.turnColor !== "black") {
      return baseline;
    }

    if (firstMoveGraceEndsAt && gameData?.moves.length === 0) {
      if (firstMoveGraceEndsAt.getTime() >= clientNowMs) {
        return baseline;
      }
      const elapsedSinceGraceEnd = clientNowMs - firstMoveGraceEndsAt.getTime();
      return Math.max(baseline - elapsedSinceGraceEnd, 0);
    }

    const elapsedSinceSync = Math.max(clientNowMs - gameQuery.dataUpdatedAt, 0);
    return Math.max(baseline - elapsedSinceSync, 0);
  }, [
    black,
    game?.baseMs,
    game?.status,
    game?.turnColor,
    firstMoveGraceEndsAt,
    gameData?.moves.length,
    clientNowMs,
    gameQuery.dataUpdatedAt,
  ]);

  const effectiveWhiteMs = useMemo(() => {
    if (!white) return game?.baseMs ?? 0;
    const baseline = white.remainingMsLive ?? game?.baseMs ?? 0;
    if (game?.status !== "active" || game.turnColor !== "white") {
      return baseline;
    }

    if (firstMoveGraceEndsAt && gameData?.moves.length === 0) {
      if (firstMoveGraceEndsAt.getTime() >= clientNowMs) {
        return baseline;
      }
      const elapsedSinceGraceEnd = clientNowMs - firstMoveGraceEndsAt.getTime();
      return Math.max(baseline - elapsedSinceGraceEnd, 0);
    }

    const elapsedSinceSync = Math.max(clientNowMs - gameQuery.dataUpdatedAt, 0);
    return Math.max(baseline - elapsedSinceSync, 0);
  }, [
    white,
    game?.baseMs,
    game?.status,
    game?.turnColor,
    firstMoveGraceEndsAt,
    gameData?.moves.length,
    clientNowMs,
    gameQuery.dataUpdatedAt,
  ]);

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

  const clockByColor = {
    white: effectiveWhiteMs,
    black: effectiveBlackMs,
  };
  const topClockMs = clockByColor[view.topColor];
  const bottomClockMs = clockByColor[view.bottomColor];
  const lowTimeMs = lowTimeThresholdMs(game?.baseMs ?? 0);
  const topIsActive = game?.status === "active" && game.turnColor === view.topColor;
  const bottomIsActive = game?.status === "active" && game.turnColor === view.bottomColor;
  const turnPlayer =
    game?.turnColor === "white" ? white : game?.turnColor === "black" ? black : undefined;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-6">
      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2.5 p-3 text-sm sm:p-4">
          <Badge variant={view.isParticipant ? "default" : "secondary"}>
            {view.isParticipant ? `You are ${view.viewerRole}` : "Spectating"}
          </Badge>
          <Badge variant="outline">Board: {view.boardOrientation} bottom</Badge>
          {turnPlayer ? (
            <Badge variant="secondary">Turn: {formatPlayerIdentity(turnPlayer)}</Badge>
          ) : null}
          {gameQuery.isFetching ? <Badge variant="outline">Syncing…</Badge> : null}
          {firstMoveGraceActive ? (
            <Badge variant="secondary">
              First-move grace {toClockLabel(firstMoveGraceRemainingMs, 60_000)}
            </Badge>
          ) : null}
          {!view.isParticipant ? (
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant={spectatorOrientation === "white" ? "default" : "outline"}
                onClick={() => setSpectatorOrientation("white")}
              >
                White view
              </Button>
              <Button
                size="sm"
                variant={spectatorOrientation === "black" ? "default" : "outline"}
                onClick={() => setSpectatorOrientation("black")}
              >
                Black view
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {game?.status === "finished" ? (
        <Alert>
          <AlertTitle>Game finished</AlertTitle>
          <AlertDescription>
            {toTerminationLabel(game.terminationReason) ?? "The game has ended."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <section className="space-y-3">
          <PlayerPanel
            seat={view.topPlayer.seat}
            color={view.topPlayer.color}
            player={view.topPlayer.player}
            isLocalPlayer={view.topPlayer.isLocalPlayer}
            isActiveTurn={topIsActive}
            isLowTime={topClockMs <= lowTimeMs}
            clockLabel={toClockLabel(topClockMs, game?.baseMs ?? 0)}
            captured={view.topColor === "white" ? capturedMaterial.whiteCaptured : capturedMaterial.blackCaptured}
          />

          <Chessboard
            fen={currentFen}
            canMove={canMove}
            orientation={view.boardOrientation}
            lastMove={lastMove}
            onMove={({ from, to, promotion }) => {
              const localChess = new Chess(currentFen);
              const result = localChess.move({ from, to, promotion });
              if (!result) return;
              setActionError(null);
              setOptimisticFen(localChess.fen());
              submitMove.mutate({ gameId, from, to, promotion });
            }}
          />

          <PlayerPanel
            seat={view.bottomPlayer.seat}
            color={view.bottomPlayer.color}
            player={view.bottomPlayer.player}
            isLocalPlayer={view.bottomPlayer.isLocalPlayer}
            isActiveTurn={bottomIsActive}
            isLowTime={bottomClockMs <= lowTimeMs}
            clockLabel={toClockLabel(bottomClockMs, game?.baseMs ?? 0)}
            captured={
              view.bottomColor === "white" ? capturedMaterial.whiteCaptured : capturedMaterial.blackCaptured
            }
            statusLabel={canMove ? "your move" : undefined}
          />
        </section>

        <aside className="space-y-3">
          <GameMetaCard
            status={game?.status ?? "loading"}
            rated={!!game?.rated}
            timeControlLabel={timeControlLabel}
            timeClassLabel={game?.timeClass ?? "rapid"}
            turnColor={game?.turnColor}
            checkedColor={checkedColor}
            white={white}
            black={black}
            terminationReason={toTerminationLabel(game?.terminationReason)}
          />

          <GameActionsCard
            isParticipant={view.isParticipant}
            gameStatus={game?.status}
            drawOfferedByOther={drawOfferedByOther}
            onResign={() => resign.mutate({ gameId })}
            onOfferDraw={() => drawOffer.mutate({ gameId })}
            onAcceptDraw={() => drawResponse.mutate({ gameId, accept: true })}
            onDeclineDraw={() => drawResponse.mutate({ gameId, accept: false })}
            onRequestRematch={() => rematch.mutate({ gameId })}
            resignPending={resign.isPending}
            drawOfferPending={drawOffer.isPending}
            drawResponsePending={drawResponse.isPending}
            rematchPending={rematch.isPending}
          />

          <MoveListCard rows={fullMoveRows} activePly={gameData?.moves.length} />
        </aside>
      </div>
    </div>
  );
}
