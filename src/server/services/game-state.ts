import { TRPCError } from "@trpc/server";

import type { gameResultEnum, gameStatusEnum, terminationReasonEnum } from "~/server/db/schema";

type GameStatus = (typeof gameStatusEnum.enumValues)[number];
type GameResult = (typeof gameResultEnum.enumValues)[number];
type TerminationReason = (typeof terminationReasonEnum.enumValues)[number];

export function assertGameIsMutable(status: GameStatus) {
  if (status === "finished" || status === "aborted") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "GAME_TERMINAL",
    });
  }
}

export function assertGameIsActive(status: GameStatus) {
  if (status !== "active") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "GAME_NOT_ACTIVE",
    });
  }
}

export function buildTerminalState(args: {
  reason: TerminationReason;
  winnerColor?: "white" | "black";
}): {
  status: GameStatus;
  result: GameResult | null;
  terminationReason: TerminationReason;
} {
  if (
    args.reason === "stalemate" ||
    args.reason === "draw_agreement" ||
    args.reason === "threefold" ||
    args.reason === "fifty_move"
  ) {
    return {
      status: "finished",
      result: "draw",
      terminationReason: args.reason,
    };
  }

  if (args.reason === "aborted") {
    return {
      status: "aborted",
      result: null,
      terminationReason: args.reason,
    };
  }

  if (!args.winnerColor) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "WINNER_COLOR_REQUIRED",
    });
  }

  return {
    status: "finished",
    result: args.winnerColor === "white" ? "white_win" : "black_win",
    terminationReason: args.reason,
  };
}
