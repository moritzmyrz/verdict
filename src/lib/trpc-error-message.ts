const trpcErrorMessages: Record<string, string> = {
  LOBBY_NOT_FOUND: "Lobby not found. Check the invite code and try again.",
  LOBBY_NOT_OPEN: "This lobby is no longer open.",
  HOST_CANNOT_JOIN_OWN_LOBBY: "You cannot join your own lobby from this screen.",
  GAME_NOT_FOUND: "This game no longer exists.",
  NOT_GAME_PARTICIPANT: "You are not a participant in this game.",
  NOT_YOUR_TURN: "It is not your turn yet.",
  OUT_OF_TIME: "You are out of time.",
  ILLEGAL_MOVE: "That move is not legal.",
  NO_DRAW_OFFER: "There is no active draw offer.",
  GAME_NOT_FINISHED: "Rematch is only available after the game ends.",
  GAME_TERMINAL: "This game is already finished.",
  GAME_NOT_ACTIVE: "This game is not active.",
  MISSING_OPPONENT: "Could not load your opponent. Refresh and try again.",
  MISSING_PLAYERS: "Could not load both players. Refresh and try again.",
};

function readCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const withData = error as {
    data?: { code?: string };
    message?: string;
  };

  if (withData.message && typeof withData.message === "string") {
    return withData.message.toUpperCase();
  }

  if (withData.data?.code && typeof withData.data.code === "string") {
    return withData.data.code.toUpperCase();
  }

  return null;
}

export function getTrpcErrorMessage(error: unknown, fallback: string) {
  const code = readCode(error);
  if (!code) {
    return fallback;
  }

  return trpcErrorMessages[code] ?? fallback;
}
