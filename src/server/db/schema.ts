import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const profile = pgTable(
  "profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    username: text("username").notNull().unique(),
    bio: text("bio"),
    countryCode: text("country_code"),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("profile_username_idx").on(table.username)],
);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const gameStatusEnum = pgEnum("game_status", [
  "created",
  "waiting_for_opponent",
  "active",
  "finished",
  "aborted",
]);

export const gameResultEnum = pgEnum("game_result", [
  "white_win",
  "black_win",
  "draw",
]);

export const terminationReasonEnum = pgEnum("termination_reason", [
  "checkmate",
  "stalemate",
  "draw_agreement",
  "threefold",
  "fifty_move",
  "timeout",
  "resignation",
  "aborted",
]);

export const colorEnum = pgEnum("player_color", ["white", "black"]);
export const timeClassEnum = pgEnum("time_class", [
  "bullet",
  "blitz",
  "rapid",
  "classical",
]);
export const lobbyStatusEnum = pgEnum("lobby_status", [
  "open",
  "started",
  "cancelled",
]);
export const lobbyVisibilityEnum = pgEnum("lobby_visibility", [
  "public",
  "private",
]);

export const games = pgTable(
  "game",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: gameStatusEnum("status").notNull().default("created"),
    rated: boolean("rated").notNull().default(true),
    timeClass: timeClassEnum("time_class").notNull(),
    baseMs: integer("base_ms").notNull(),
    incrementMs: integer("increment_ms").notNull().default(0),
    currentFen: text("current_fen").notNull(),
    turnColor: colorEnum("turn_color").notNull().default("white"),
    result: gameResultEnum("result"),
    terminationReason: terminationReasonEnum("termination_reason"),
    winnerUserId: text("winner_user_id").references(() => user.id),
    drawOfferedByUserId: text("draw_offered_by_user_id").references(
      () => user.id,
    ),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("game_status_created_idx").on(table.status, table.createdAt),
    index("game_winner_idx").on(table.winnerUserId),
  ],
);

export const gameParticipants = pgTable(
  "game_participant",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    color: colorEnum("color").notNull(),
    remainingMs: integer("remaining_ms").notNull(),
    lastClockStartedAt: timestamp("last_clock_started_at"),
    isConnected: boolean("is_connected").notNull().default(false),
    ratingBefore: integer("rating_before"),
    ratingAfter: integer("rating_after"),
    ratingDelta: integer("rating_delta"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("game_participant_game_user_unique").on(
      table.gameId,
      table.userId,
    ),
    uniqueIndex("game_participant_game_color_unique").on(
      table.gameId,
      table.color,
    ),
    index("game_participant_user_idx").on(table.userId),
  ],
);

export const moves = pgTable(
  "move",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    ply: integer("ply").notNull(),
    uci: text("uci").notNull(),
    san: text("san").notNull(),
    fenAfter: text("fen_after").notNull(),
    playedByUserId: text("played_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    playedAt: timestamp("played_at")
      .$defaultFn(() => new Date())
      .notNull(),
    clockMsAfterMove: integer("clock_ms_after_move").notNull(),
  },
  (table) => [
    uniqueIndex("move_game_ply_unique").on(table.gameId, table.ply),
    index("move_game_idx").on(table.gameId),
  ],
);

export const ratings = pgTable(
  "rating",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    timeClass: timeClassEnum("time_class").notNull(),
    value: integer("value").notNull().default(1200),
    gamesPlayed: integer("games_played").notNull().default(0),
    provisional: boolean("provisional").notNull().default(true),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("rating_user_time_class_unique").on(
      table.userId,
      table.timeClass,
    ),
  ],
);

export const ratingHistory = pgTable(
  "rating_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    timeClass: timeClassEnum("time_class").notNull(),
    valueBefore: integer("value_before").notNull(),
    valueAfter: integer("value_after").notNull(),
    delta: integer("delta").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("rating_history_user_time_idx").on(
      table.userId,
      table.timeClass,
      table.createdAt,
    ),
    index("rating_history_game_idx").on(table.gameId),
  ],
);

export const playerStatistics = pgTable(
  "player_statistics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    timeClass: timeClassEnum("time_class").notNull(),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    bestRating: integer("best_rating").notNull().default(1200),
    gamesPlayed: integer("games_played").notNull().default(0),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("player_statistics_user_time_class_unique").on(
      table.userId,
      table.timeClass,
    ),
  ],
);

export const gameLobbies = pgTable(
  "game_lobby",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hostUserId: text("host_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    gameId: uuid("game_id").references(() => games.id, {
      onDelete: "set null",
    }),
    rated: boolean("rated").notNull().default(true),
    timeClass: timeClassEnum("time_class").notNull(),
    baseMs: integer("base_ms").notNull(),
    incrementMs: integer("increment_ms").notNull().default(0),
    visibility: lobbyVisibilityEnum("visibility").notNull().default("private"),
    inviteCode: text("invite_code").notNull(),
    status: lobbyStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("game_lobby_invite_code_unique").on(table.inviteCode),
    index("game_lobby_status_idx").on(table.status, table.createdAt),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
  games: many(gameParticipants),
  ratings: many(ratings),
  ratingHistory: many(ratingHistory),
  statistics: many(playerStatistics),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, { fields: [profile.userId], references: [user.id] }),
}));

export const gameRelations = relations(games, ({ one, many }) => ({
  winner: one(user, { fields: [games.winnerUserId], references: [user.id] }),
  drawOfferedBy: one(user, {
    fields: [games.drawOfferedByUserId],
    references: [user.id],
  }),
  participants: many(gameParticipants),
  moves: many(moves),
}));

export const gameParticipantRelations = relations(
  gameParticipants,
  ({ one }) => ({
    game: one(games, {
      fields: [gameParticipants.gameId],
      references: [games.id],
    }),
    user: one(user, {
      fields: [gameParticipants.userId],
      references: [user.id],
    }),
  }),
);

export const moveRelations = relations(moves, ({ one }) => ({
  game: one(games, { fields: [moves.gameId], references: [games.id] }),
  playedBy: one(user, {
    fields: [moves.playedByUserId],
    references: [user.id],
  }),
}));

export const ratingRelations = relations(ratings, ({ one }) => ({
  user: one(user, { fields: [ratings.userId], references: [user.id] }),
}));

export const ratingHistoryRelations = relations(ratingHistory, ({ one }) => ({
  user: one(user, { fields: [ratingHistory.userId], references: [user.id] }),
  game: one(games, { fields: [ratingHistory.gameId], references: [games.id] }),
}));

export const playerStatisticsRelations = relations(
  playerStatistics,
  ({ one }) => ({
    user: one(user, {
      fields: [playerStatistics.userId],
      references: [user.id],
    }),
  }),
);

export const gameLobbiesRelations = relations(gameLobbies, ({ one }) => ({
  host: one(user, { fields: [gameLobbies.hostUserId], references: [user.id] }),
  game: one(games, { fields: [gameLobbies.gameId], references: [games.id] }),
}));
