import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { gameParticipants, games } from "~/server/db/schema";

export const historyRouter = createTRPCRouter({
  listMyGames: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const myRows = await ctx.db
        .select({
          gameId: games.id,
          status: games.status,
          result: games.result,
          terminationReason: games.terminationReason,
          timeClass: games.timeClass,
          baseMs: games.baseMs,
          incrementMs: games.incrementMs,
          rated: games.rated,
          endedAt: games.endedAt,
          myColor: gameParticipants.color,
        })
        .from(gameParticipants)
        .innerJoin(games, eq(gameParticipants.gameId, games.id))
        .where(eq(gameParticipants.userId, ctx.session.user.id))
        .orderBy(desc(games.endedAt))
        .limit(input.limit);

      if (myRows.length === 0) {
        return [];
      }

      const opponentRows = await ctx.db.query.gameParticipants.findMany({
        where: and(
          inArray(
            gameParticipants.gameId,
            myRows.map((row) => row.gameId),
          ),
          ne(gameParticipants.userId, ctx.session.user.id),
        ),
        with: {
          user: true,
        },
      });

      const opponentByGameId = new Map(
        opponentRows.map((row) => [
          row.gameId,
          {
            opponentId: row.userId,
            opponentName: row.user.name,
            opponentImage: row.user.image,
          },
        ]),
      );

      return myRows.map((row) => ({
        ...row,
        ...opponentByGameId.get(row.gameId),
      }));
    }),
});
