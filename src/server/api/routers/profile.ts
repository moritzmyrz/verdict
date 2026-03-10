import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import {
  gameParticipants,
  games,
  playerStatistics,
  profile,
  ratings,
} from "~/server/db/schema";

export const profileRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(24),
        bio: z.string().max(200).optional(),
        countryCode: z.string().length(2).optional(),
        isPublic: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.profile.findFirst({
        where: eq(profile.userId, ctx.session.user.id),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(profile)
          .set({
            username: input.username,
            bio: input.bio ?? null,
            countryCode: input.countryCode?.toUpperCase() ?? null,
            isPublic: input.isPublic,
            updatedAt: new Date(),
          })
          .where(eq(profile.userId, ctx.session.user.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(profile)
        .values({
          userId: ctx.session.user.id,
          username: input.username,
          bio: input.bio ?? null,
          countryCode: input.countryCode?.toUpperCase() ?? null,
          isPublic: input.isPublic,
        })
        .returning();

      return created;
    }),

  getPublic: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const baseProfile = await ctx.db.query.profile.findFirst({
        where: and(eq(profile.username, input.username), eq(profile.isPublic, true)),
      });

      if (!baseProfile) {
        return null;
      }

      const [stats, userRatings] = await Promise.all([
        ctx.db.query.playerStatistics.findMany({
          where: eq(playerStatistics.userId, baseProfile.userId),
        }),
        ctx.db.query.ratings.findMany({
          where: eq(ratings.userId, baseProfile.userId),
        }),
      ]);

      const latestGames = await ctx.db
        .select({
          gameId: games.id,
          result: games.result,
          terminationReason: games.terminationReason,
          endedAt: games.endedAt,
          timeClass: games.timeClass,
          rated: games.rated,
        })
        .from(gameParticipants)
        .innerJoin(games, eq(gameParticipants.gameId, games.id))
        .where(eq(gameParticipants.userId, baseProfile.userId))
        .orderBy(desc(games.endedAt))
        .limit(10);

      return {
        profile: baseProfile,
        ratings: userRatings,
        stats,
        recentGames: latestGames,
      };
    }),

  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const myProfile = await ctx.db.query.profile.findFirst({
      where: eq(profile.userId, ctx.session.user.id),
    });

    const [stats, userRatings] = await Promise.all([
      ctx.db.query.playerStatistics.findMany({
        where: eq(playerStatistics.userId, ctx.session.user.id),
      }),
      ctx.db.query.ratings.findMany({
        where: eq(ratings.userId, ctx.session.user.id),
      }),
    ]);

    return {
      profile: myProfile,
      ratings: userRatings,
      stats,
    };
  }),
});
