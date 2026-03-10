"use client";

import { Chess } from "chess.js";
import { useState } from "react";

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

export function GameClient({ gameId, currentUserId }: Props) {
  const utils = api.useUtils();
  const gameQuery = api.game.getById.useQuery(
    { gameId },
    {
      refetchInterval: 2000,
    },
  );

  const [optimisticFen, setOptimisticFen] = useState<string | null>(null);

  const submitMove = api.game.submitMove.useMutation({
    onSuccess: async () => {
      setOptimisticFen(null);
      await utils.game.getById.invalidate({ gameId });
      await utils.history.listMyGames.invalidate();
      await utils.profile.getMyStats.invalidate();
    },
    onError: () => {
      setOptimisticFen(null);
    },
  });

  const resign = api.game.resign.useMutation({
    onSuccess: async () => {
      await utils.game.getById.invalidate({ gameId });
      await utils.history.listMyGames.invalidate();
      await utils.profile.getMyStats.invalidate();
    },
  });

  const drawOffer = api.game.offerDraw.useMutation({
    onSuccess: async () => {
      await utils.game.getById.invalidate({ gameId });
    },
  });

  const drawResponse = api.game.respondDraw.useMutation({
    onSuccess: async () => {
      await utils.game.getById.invalidate({ gameId });
      await utils.history.listMyGames.invalidate();
      await utils.profile.getMyStats.invalidate();
    },
  });

  const rematch = api.game.requestRematch.useMutation();

  const gameData = gameQuery.data;
  const game = gameData?.game;
  const participants = gameData?.participants ?? [];
  const me = participants.find((participant) => participant.userId === currentUserId);
  const white = participants.find((participant) => participant.color === "white");
  const black = participants.find((participant) => participant.color === "black");
  const canMove = !!me && game?.status === "active" && game.turnColor === me.color;

  const currentFen = optimisticFen ?? game?.currentFen ?? new Chess().fen();

  const drawOfferedByOther =
    !!game?.drawOfferedByUserId && game.drawOfferedByUserId !== currentUserId;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 text-zinc-100">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 p-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Black</p>
              <p className="font-medium">{black?.userId ?? "Waiting"}</p>
            </div>
            <p className="text-lg font-semibold">
              {toClockLabel(black?.remainingMsLive ?? game?.baseMs ?? 0)}
            </p>
          </div>

          <Chessboard
            fen={currentFen}
            canMove={canMove}
            onMove={({ from, to, promotion }) => {
              const localChess = new Chess(currentFen);
              const result = localChess.move({ from, to, promotion });
              if (!result) return;
              setOptimisticFen(localChess.fen());
              submitMove.mutate({ gameId, from, to, promotion });
            }}
          />

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 p-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-zinc-400">White</p>
              <p className="font-medium">{white?.userId ?? "Waiting"}</p>
            </div>
            <p className="text-lg font-semibold">
              {toClockLabel(white?.remainingMsLive ?? game?.baseMs ?? 0)}
            </p>
          </div>
        </div>

        <aside className="space-y-4 rounded-xl border border-white/10 bg-zinc-900 p-4">
          <div>
            <p className="text-sm text-zinc-400">Status</p>
            <p className="font-semibold">{game?.status ?? "Loading"}</p>
            {game?.terminationReason ? (
              <p className="text-sm text-zinc-400">{game.terminationReason}</p>
            ) : null}
          </div>
          <div>
            <p className="text-sm text-zinc-400">Time control</p>
            <p className="font-semibold">
              {Math.round((game?.baseMs ?? 0) / 60000)}+{Math.round((game?.incrementMs ?? 0) / 1000)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
              onClick={() => resign.mutate({ gameId })}
              disabled={resign.isPending || game?.status !== "active"}
            >
              Resign
            </button>
            <button
              type="button"
              className="rounded-md bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
              onClick={() => drawOffer.mutate({ gameId })}
              disabled={drawOffer.isPending || game?.status !== "active"}
            >
              Offer draw
            </button>
            {drawOfferedByOther ? (
              <>
                <button
                  type="button"
                  className="rounded-md bg-emerald-700 px-3 py-2 text-sm hover:bg-emerald-600"
                  onClick={() => drawResponse.mutate({ gameId, accept: true })}
                >
                  Accept draw
                </button>
                <button
                  type="button"
                  className="rounded-md bg-rose-700 px-3 py-2 text-sm hover:bg-rose-600"
                  onClick={() => drawResponse.mutate({ gameId, accept: false })}
                >
                  Decline draw
                </button>
              </>
            ) : null}
            {game?.status === "finished" ? (
              <button
                type="button"
                className="rounded-md bg-blue-700 px-3 py-2 text-sm hover:bg-blue-600"
                onClick={() => rematch.mutate({ gameId })}
                disabled={rematch.isPending}
              >
                Request rematch
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto rounded-md border border-white/10 p-3">
            <p className="mb-2 text-sm text-zinc-400">Moves</p>
            <ol className="space-y-1 text-sm">
              {gameData?.moves.map((move, index) => (
                <li key={move.id}>
                  {index + 1}. {move.san}
                </li>
              )) ?? null}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
