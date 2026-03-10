import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { Chess } from "chess.js";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { gameLobbies, gameParticipants, games } from "~/server/db/schema";

const createLobbyInput = z.object({
  rated: z.boolean().default(true),
  timeClass: z.enum(["bullet", "blitz", "rapid", "classical"]),
  baseMs: z.number().int().positive(),
  incrementMs: z.number().int().min(0).default(0),
  visibility: z.enum(["public", "private"]).default("private"),
});

function buildInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const lobbyRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createLobbyInput)
    .mutation(async ({ ctx, input }) => {
      const inviteCode = buildInviteCode();
      const [lobby] = await ctx.db
        .insert(gameLobbies)
        .values({
          hostUserId: ctx.session.user.id,
          rated: input.rated,
          timeClass: input.timeClass,
          baseMs: input.baseMs,
          incrementMs: input.incrementMs,
          visibility: input.visibility,
          inviteCode,
          status: "open",
        })
        .returning();

      if (!lobby) {
        throw new Error("Could not create lobby");
      }

      return lobby;
    }),

  joinByCode: protectedProcedure
    .input(z.object({ inviteCode: z.string().min(6).max(8) }))
    .mutation(async ({ ctx, input }) => {
      const lobby = await ctx.db.query.gameLobbies.findFirst({
        where: eq(gameLobbies.inviteCode, input.inviteCode.toUpperCase()),
      });

      if (!lobby) {
        throw new TRPCError({ code: "NOT_FOUND", message: "LOBBY_NOT_FOUND" });
      }

      if (lobby.status === "started" && lobby.gameId) {
        return {
          gameId: lobby.gameId,
        };
      }

      if (lobby.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "LOBBY_NOT_OPEN",
        });
      }

      if (lobby.hostUserId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "HOST_CANNOT_JOIN_OWN_LOBBY",
        });
      }

      const game = await ctx.db.transaction(async (tx) => {
        const [createdGame] = await tx
          .insert(games)
          .values({
            status: "active",
            rated: lobby.rated,
            timeClass: lobby.timeClass,
            baseMs: lobby.baseMs,
            incrementMs: lobby.incrementMs,
            currentFen: new Chess().fen(),
            turnColor: "white",
            startedAt: new Date(),
          })
          .returning();

        if (!createdGame) {
          throw new Error("Could not create game");
        }

        const hostColor = Math.random() > 0.5 ? "white" : "black";
        const guestColor = hostColor === "white" ? "black" : "white";

        await tx.insert(gameParticipants).values([
          {
            gameId: createdGame.id,
            userId: lobby.hostUserId,
            color: hostColor,
            remainingMs: lobby.baseMs,
            lastClockStartedAt: null,
          },
          {
            gameId: createdGame.id,
            userId: ctx.session.user.id,
            color: guestColor,
            remainingMs: lobby.baseMs,
            lastClockStartedAt: null,
          },
        ]);

        await tx
          .update(gameLobbies)
          .set({
            status: "started",
            gameId: createdGame.id,
            updatedAt: new Date(),
          })
          .where(eq(gameLobbies.id, lobby.id));

        return createdGame;
      });

      return {
        gameId: game.id,
      };
    }),

  listOpen: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.gameLobbies.findMany({
      where: eq(gameLobbies.status, "open"),
      limit: 20,
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }),
});
