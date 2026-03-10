export const DEFAULT_RATING = 1200;
export const PROVISIONAL_GAMES = 30;

type EloArgs = {
  playerRating: number;
  opponentRating: number;
  score: 0 | 0.5 | 1;
  gamesPlayed: number;
};

function getKFactor(gamesPlayed: number) {
  return gamesPlayed < PROVISIONAL_GAMES ? 40 : 20;
}

export function expectedScore(playerRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function calculateEloDelta({
  playerRating,
  opponentRating,
  score,
  gamesPlayed,
}: EloArgs) {
  const expected = expectedScore(playerRating, opponentRating);
  const k = getKFactor(gamesPlayed);
  return Math.round(k * (score - expected));
}
