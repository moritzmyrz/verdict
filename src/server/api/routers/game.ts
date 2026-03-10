import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { Chess } from "chess.js";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { computeRemainingMs } from "~/server/services/clock";
import { applyRatingsAndStats } from "~/server/services/progression";
import { publishGameEvent } from "~/server/services/realtime";
import {
  gameParticipants,
  games,
  gameLobbies,
  moves,
  type colorEnum,
} from "~/server/db/schema";
import {
  assertGameIsActive,
  assertGameIsMutable,
  buildTerminalState,
} from "~/server/services/game-state";

type Color = (typeof colorEnum.enumValues)[number];
type RatingResult = {
  white: { before: number; after: number; delta: number };
  black: { before: number; after: number; delta: number };
};

const moveInput = z.object({
  gameId: z.string().uuid(),
  from: z.string().length(2),
  to: z.string().length(2),
  promotion: z.enum(["q", "r", "b", "n"]).optional(),
});

function normalizeClock(args: {
  remainingMs: number;
  lastClockStartedAt: Date | null;
  isTurn: boolean;
  now: Date;
}) {
  if (!args.isTurn) {
    return args.remainingMs;
  }
  return computeRemainingMs({
    remainingMs: args.remainingMs,
    lastClockStartedAt: args.lastClockStartedAt,
    now: args.now,
  });
}

function getScoreFromResult(result: "white_win" | "black_win" | "draw", color: Color) {
  if (result === "draw") return 0.5 as const;
  if (result === "white_win") return color === "white" ? (1 as const) : (0 as const);
  return color === "black" ? (1 as const) : (0 as const);
}

export const gameRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.query.games.findFirst({
        where: eq(games.id, input.gameId),
      });
      if (!game) return null;

      const participants = await ctx.db.query.gameParticipants.findMany({
        where: eq(gameParticipants.gameId, input.gameId),
      });

      const gameMoves = await ctx.db.query.moves.findMany({
        where: eq(moves.gameId, input.gameId),
        orderBy: [asc(moves.ply)],
      });

      const now = new Date();
      const withClocks = participants.map((participant) => ({
        ...participant,
        remainingMsLive: normalizeClock({
          remainingMs: participant.remainingMs,
          lastClockStartedAt: participant.lastClockStartedAt,
          isTurn: game.turnColor === participant.color && game.status === "active",
          now,
        }),
      }));

      return {
        game,
        participants: withClocks,
        moves: gameMoves,
      };
    }),

  submitMove: protectedProcedure.input(moveInput).mutation(async ({ ctx, input }) => {
    const now = new Date();
    const game = await ctx.db.query.games.findFirst({
      where: eq(games.id, input.gameId),
    });
    if (!game) {
      throw new TRPCError({ code: "NOT_FOUND", message: "GAME_NOT_FOUND" });
    }

    assertGameIsActive(game.status);

    const participants = await ctx.db.query.gameParticipants.findMany({
      where: eq(gameParticipants.gameId, game.id),
    });
    const me = participants.find((participant) => participant.userId === ctx.session.user.id);
    if (!me) {
      throw new TRPCError({ code: "FORBIDDEN", message: "NOT_GAME_PARTICIPANT" });
    }
    if (me.color !== game.turnColor) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "NOT_YOUR_TURN" });
    }

    const opponent = participants.find((participant) => participant.userId !== me.userId);
    if (!opponent) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MISSING_OPPONENT" });
    }

    const effectiveRemaining = computeRemainingMs({
      remainingMs: me.remainingMs,
      lastClockStartedAt: me.lastClockStartedAt,
      now,
    });

    if (effectiveRemaining <= 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "OUT_OF_TIME" });
    }

    const chess = new Chess(game.currentFen);
    const move = chess.move({
      from: input.from,
      to: input.to,
      promotion: input.promotion,
    });

    if (!move) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "ILLEGAL_MOVE" });
    }

    const nextTurn = chess.turn() === "w" ? "white" : "black";
    const moverRemaining = effectiveRemaining + game.incrementMs;
    const ply = (await ctx.db.query.moves.findMany({
      where: eq(moves.gameId, game.id),
      columns: { ply: true },
      orderBy: [asc(moves.ply)],
    })).length + 1;

    const terminalReason = chess.isGameOver()
      ? chess.isCheckmate()
        ? "checkmate"
        : chess.isStalemate()
          ? "stalemate"
          : chess.isThreefoldRepetition()
            ? "threefold"
            : "fifty_move"
      : null;

    const updatePayload: Partial<typeof games.$inferInsert> = {
      currentFen: chess.fen(),
      turnColor: nextTurn,
      drawOfferedByUserId: null,
      updatedAt: now,
    };

    if (terminalReason) {
      const terminal = buildTerminalState({
        reason: terminalReason,
        winnerColor: terminalReason === "checkmate" ? me.color : undefined,
      });

      updatePayload.status = terminal.status;
      updatePayload.result = terminal.result;
      updatePayload.terminationReason = terminal.terminationReason;
      updatePayload.winnerUserId =
        terminal.result === "draw"
          ? null
          : terminal.result === "white_win"
            ? me.color === "white"
              ? me.userId
              : opponent.userId
            : me.color === "black"
              ? me.userId
              : opponent.userId;
      updatePayload.endedAt = now;
    }

    await ctx.db.transaction(async (tx) => {
      await tx.insert(moves).values({
        gameId: game.id,
        ply,
        uci: `${input.from}${input.to}${input.promotion ?? ""}`,
        san: move.san,
        fenAfter: chess.fen(),
        playedByUserId: me.userId,
        playedAt: now,
        clockMsAfterMove: moverRemaining,
      });

      await tx
        .update(gameParticipants)
        .set({
          remainingMs: moverRemaining,
          lastClockStartedAt: null,
          updatedAt: now,
        })
        .where(
          and(eq(gameParticipants.gameId, game.id), eq(gameParticipants.userId, me.userId)),
        );

      await tx
        .update(gameParticipants)
        .set({
          lastClockStartedAt: terminalReason ? null : now,
          updatedAt: now,
        })
        .where(
          and(
            eq(gameParticipants.gameId, game.id),
            eq(gameParticipants.userId, opponent.userId),
          ),
        );

      await tx.update(games).set(updatePayload).where(eq(games.id, game.id));

      if (updatePayload.result) {
        const ratingResult: RatingResult = await applyRatingsAndStats({
          tx,
          gameId: game.id,
          rated: game.rated,
          timeClass: game.timeClass,
          white: {
            userId: me.color === "white" ? me.userId : opponent.userId,
            score: getScoreFromResult(updatePayload.result, "white"),
          },
          black: {
            userId: me.color === "black" ? me.userId : opponent.userId,
            score: getScoreFromResult(updatePayload.result, "black"),
          },
        });

        await Promise.all([
          tx
            .update(gameParticipants)
            .set({
              ratingBefore: ratingResult.white.before,
              ratingAfter: ratingResult.white.after,
              ratingDelta: ratingResult.white.delta,
            })
            .where(
              and(eq(gameParticipants.gameId, game.id), eq(gameParticipants.color, "white")),
            ),
          tx
            .update(gameParticipants)
            .set({
              ratingBefore: ratingResult.black.before,
              ratingAfter: ratingResult.black.after,
              ratingDelta: ratingResult.black.delta,
            })
            .where(
              and(eq(gameParticipants.gameId, game.id), eq(gameParticipants.color, "black")),
            ),
        ]);
      }
    });

    await publishGameEvent({
      type: "move.accepted",
      gameId: game.id,
      ply,
      uci: `${input.from}${input.to}${input.promotion ?? ""}`,
      san: move.san,
      fenAfter: chess.fen(),
      turnColor: nextTurn,
      remainingByColor: {
        [me.color]: moverRemaining,
        [opponent.color]: opponent.remainingMs,
      } as Record<Color, number>,
    });

    if (updatePayload.result) {
      await publishGameEvent({
        type: "game.ended",
        gameId: game.id,
        result: updatePayload.result,
        terminationReason: updatePayload.terminationReason ?? "aborted",
      });
    }

    return {
      accepted: true,
      san: move.san,
      fen: chess.fen(),
    };
  }),

  resign: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.query.games.findFirst({
        where: eq(games.id, input.gameId),
      });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "GAME_NOT_FOUND" });
      }

      assertGameIsMutable(game.status);

      const participants = await ctx.db.query.gameParticipants.findMany({
        where: eq(gameParticipants.gameId, game.id),
      });

      const me = participants.find((participant) => participant.userId === ctx.session.user.id);
      if (!me) {
        throw new TRPCError({ code: "FORBIDDEN", message: "NOT_GAME_PARTICIPANT" });
      }
      const opponent = participants.find((participant) => participant.userId !== me.userId);
      if (!opponent) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MISSING_OPPONENT" });
      }

      const terminal = buildTerminalState({
        reason: "resignation",
        winnerColor: opponent.color,
      });

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(games)
          .set({
            status: terminal.status,
            result: terminal.result,
            terminationReason: terminal.terminationReason,
            winnerUserId: opponent.userId,
            endedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(games.id, game.id));

        const ratingResult: RatingResult = await applyRatingsAndStats({
          tx,
          gameId: game.id,
          rated: game.rated,
          timeClass: game.timeClass,
          white: {
            userId: me.color === "white" ? me.userId : opponent.userId,
            score: terminal.result ? getScoreFromResult(terminal.result, "white") : 0.5,
          },
          black: {
            userId: me.color === "black" ? me.userId : opponent.userId,
            score: terminal.result ? getScoreFromResult(terminal.result, "black") : 0.5,
          },
        });

        await Promise.all([
          tx
            .update(gameParticipants)
            .set({
              ratingBefore: ratingResult.white.before,
              ratingAfter: ratingResult.white.after,
              ratingDelta: ratingResult.white.delta,
              lastClockStartedAt: null,
            })
            .where(
              and(eq(gameParticipants.gameId, game.id), eq(gameParticipants.color, "white")),
            ),
          tx
            .update(gameParticipants)
            .set({
              ratingBefore: ratingResult.black.before,
              ratingAfter: ratingResult.black.after,
              ratingDelta: ratingResult.black.delta,
              lastClockStartedAt: null,
            })
            .where(
              and(eq(gameParticipants.gameId, game.id), eq(gameParticipants.color, "black")),
            ),
        ]);
      });

      await publishGameEvent({
        type: "game.ended",
        gameId: game.id,
        result: terminal.result,
        terminationReason: terminal.terminationReason,
      });

      return { ok: true };
    }),

  offerDraw: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(games)
        .set({
          drawOfferedByUserId: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(games.id, input.gameId));
      return { ok: true };
    }),

  respondDraw: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        accept: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.query.games.findFirst({
        where: eq(games.id, input.gameId),
      });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "GAME_NOT_FOUND" });
      }
      if (!game.drawOfferedByUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "NO_DRAW_OFFER" });
      }

      if (!input.accept) {
        await ctx.db
          .update(games)
          .set({ drawOfferedByUserId: null, updatedAt: new Date() })
          .where(eq(games.id, game.id));
        return { accepted: false };
      }

      const participants = await ctx.db.query.gameParticipants.findMany({
        where: eq(gameParticipants.gameId, game.id),
      });
      const white = participants.find((participant) => participant.color === "white");
      const black = participants.find((participant) => participant.color === "black");
      if (!white || !black) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MISSING_PLAYERS" });
      }

      const terminal = buildTerminalState({
        reason: "draw_agreement",
      });

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(games)
          .set({
            status: terminal.status,
            result: terminal.result,
            terminationReason: terminal.terminationReason,
            drawOfferedByUserId: null,
            endedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(games.id, game.id));

        const ratingResult: RatingResult = await applyRatingsAndStats({
          tx,
          gameId: game.id,
          rated: game.rated,
          timeClass: game.timeClass,
          white: { userId: white.userId, score: 0.5 },
          black: { userId: black.userId, score: 0.5 },
        });

        await Promise.all([
          tx
            .update(gameParticipants)
            .set({
              ratingBefore: ratingResult.white.before,
              ratingAfter: ratingResult.white.after,
              ratingDelta: ratingResult.white.delta,
              lastClockStartedAt: null,
            })
            .where(
              and(eq(gameParticipants.gameId, game.id), eq(gameParticipants.color, "white")),
            ),
          tx
            .update(gameParticipants)
            .set({
              ratingBefore: ratingResult.black.before,
              ratingAfter: ratingResult.black.after,
              ratingDelta: ratingResult.black.delta,
              lastClockStartedAt: null,
            })
            .where(
              and(eq(gameParticipants.gameId, game.id), eq(gameParticipants.color, "black")),
            ),
        ]);
      });

      await publishGameEvent({
        type: "game.ended",
        gameId: game.id,
        result: "draw",
        terminationReason: "draw_agreement",
      });

      return { accepted: true };
    }),

  requestRematch: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.query.games.findFirst({
        where: eq(games.id, input.gameId),
      });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "GAME_NOT_FOUND" });
      }

      if (game.status !== "finished") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "GAME_NOT_FINISHED" });
      }

      const participants = await ctx.db.query.gameParticipants.findMany({
        where: eq(gameParticipants.gameId, game.id),
      });

      const white = participants.find((participant) => participant.color === "white");
      const black = participants.find((participant) => participant.color === "black");
      if (!white || !black) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "MISSING_PLAYERS" });
      }

      const [lobby] = await ctx.db
        .insert(gameLobbies)
        .values({
          hostUserId: ctx.session.user.id,
          rated: game.rated,
          timeClass: game.timeClass,
          baseMs: game.baseMs,
          incrementMs: game.incrementMs,
          visibility: "private",
          inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
          status: "open",
        })
        .returning();

      return lobby;
    }),
});
