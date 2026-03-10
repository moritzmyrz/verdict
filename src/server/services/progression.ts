/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { and, eq } from "drizzle-orm";

import {
  playerStatistics,
  ratingHistory,
  ratings,
  type timeClassEnum,
} from "~/server/db/schema";
import { calculateEloDelta, DEFAULT_RATING } from "~/server/services/rating";

type TimeClass = (typeof timeClassEnum.enumValues)[number];

type ParticipantInput = {
  userId: string;
  score: 0 | 0.5 | 1;
};

function nextStreak(current: number, score: number) {
  if (score === 0.5) return 0;
  if (score === 1) return current >= 0 ? current + 1 : 1;
  return current <= 0 ? current - 1 : -1;
}

export async function applyRatingsAndStats(args: {
  tx: any;
  gameId: string;
  timeClass: TimeClass;
  rated: boolean;
  white: ParticipantInput;
  black: ParticipantInput;
}) {
  const [whiteRatingRow, blackRatingRow] = await Promise.all([
    args.tx.query.ratings.findFirst({
      where: and(
        eq(ratings.userId, args.white.userId),
        eq(ratings.timeClass, args.timeClass),
      ),
    }),
    args.tx.query.ratings.findFirst({
      where: and(
        eq(ratings.userId, args.black.userId),
        eq(ratings.timeClass, args.timeClass),
      ),
    }),
  ]);

  const whiteBefore = whiteRatingRow?.value ?? DEFAULT_RATING;
  const blackBefore = blackRatingRow?.value ?? DEFAULT_RATING;
  const whiteGames = whiteRatingRow?.gamesPlayed ?? 0;
  const blackGames = blackRatingRow?.gamesPlayed ?? 0;

  const whiteDelta = args.rated
    ? calculateEloDelta({
        playerRating: whiteBefore,
        opponentRating: blackBefore,
        score: args.white.score,
        gamesPlayed: whiteGames,
      })
    : 0;
  const blackDelta = args.rated
    ? calculateEloDelta({
        playerRating: blackBefore,
        opponentRating: whiteBefore,
        score: args.black.score,
        gamesPlayed: blackGames,
      })
    : 0;

  const whiteAfter = whiteBefore + whiteDelta;
  const blackAfter = blackBefore + blackDelta;

  await Promise.all([
    args.tx
      .insert(ratings)
      .values({
        userId: args.white.userId,
        timeClass: args.timeClass,
        value: whiteAfter,
        gamesPlayed: whiteGames + 1,
        provisional: whiteGames + 1 < 30,
      })
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.timeClass],
        set: {
          value: whiteAfter,
          gamesPlayed: whiteGames + 1,
          provisional: whiteGames + 1 < 30,
          updatedAt: new Date(),
        },
      }),
    args.tx
      .insert(ratings)
      .values({
        userId: args.black.userId,
        timeClass: args.timeClass,
        value: blackAfter,
        gamesPlayed: blackGames + 1,
        provisional: blackGames + 1 < 30,
      })
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.timeClass],
        set: {
          value: blackAfter,
          gamesPlayed: blackGames + 1,
          provisional: blackGames + 1 < 30,
          updatedAt: new Date(),
        },
      }),
  ]);

  if (args.rated) {
    await args.tx.insert(ratingHistory).values([
      {
        userId: args.white.userId,
        gameId: args.gameId,
        timeClass: args.timeClass,
        valueBefore: whiteBefore,
        valueAfter: whiteAfter,
        delta: whiteDelta,
      },
      {
        userId: args.black.userId,
        gameId: args.gameId,
        timeClass: args.timeClass,
        valueBefore: blackBefore,
        valueAfter: blackAfter,
        delta: blackDelta,
      },
    ]);
  }

  await Promise.all([
    updateStats(args.tx, {
      userId: args.white.userId,
      timeClass: args.timeClass,
      score: args.white.score,
      ratingAfter: whiteAfter,
    }),
    updateStats(args.tx, {
      userId: args.black.userId,
      timeClass: args.timeClass,
      score: args.black.score,
      ratingAfter: blackAfter,
    }),
  ]);

  return {
    white: { before: whiteBefore, after: whiteAfter, delta: whiteDelta },
    black: { before: blackBefore, after: blackAfter, delta: blackDelta },
  };
}

async function updateStats(
  tx: any,
  args: {
    userId: string;
    timeClass: TimeClass;
    score: 0 | 0.5 | 1;
    ratingAfter: number;
  },
) {
  const existing = await tx.query.playerStatistics.findFirst({
    where: and(
      eq(playerStatistics.userId, args.userId),
      eq(playerStatistics.timeClass, args.timeClass),
    ),
  });

  const wins = (existing?.wins ?? 0) + (args.score === 1 ? 1 : 0);
  const losses = (existing?.losses ?? 0) + (args.score === 0 ? 1 : 0);
  const draws = (existing?.draws ?? 0) + (args.score === 0.5 ? 1 : 0);
  const gamesPlayed = (existing?.gamesPlayed ?? 0) + 1;
  const currentStreak = nextStreak(existing?.currentStreak ?? 0, args.score);
  const bestStreak = Math.max(existing?.bestStreak ?? 0, currentStreak);
  const bestRating = Math.max(existing?.bestRating ?? DEFAULT_RATING, args.ratingAfter);

  await tx
    .insert(playerStatistics)
    .values({
      userId: args.userId,
      timeClass: args.timeClass,
      wins,
      losses,
      draws,
      gamesPlayed,
      currentStreak,
      bestStreak,
      bestRating,
    })
    .onConflictDoUpdate({
      target: [playerStatistics.userId, playerStatistics.timeClass],
      set: {
        wins,
        losses,
        draws,
        gamesPlayed,
        currentStreak,
        bestStreak,
        bestRating,
        updatedAt: new Date(),
      },
    });
}
