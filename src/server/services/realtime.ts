import { env } from "~/env";

export type GameRealtimeEvent =
  | {
      type: "move.accepted";
      gameId: string;
      ply: number;
      uci: string;
      san: string;
      fenAfter: string;
      turnColor: "white" | "black";
      remainingByColor: Record<"white" | "black", number>;
    }
  | {
      type: "game.ended";
      gameId: string;
      result: "white_win" | "black_win" | "draw" | null;
      terminationReason:
        | "checkmate"
        | "stalemate"
        | "draw_agreement"
        | "threefold"
        | "fifty_move"
        | "timeout"
        | "resignation"
        | "aborted";
    };

export async function publishGameEvent(event: GameRealtimeEvent) {
  if (!env.ABLY_API_KEY) {
    return;
  }

  const channel = encodeURIComponent(`game:${event.gameId}`);
  const auth = Buffer.from(env.ABLY_API_KEY).toString("base64");

  try {
    const response = await fetch(`https://rest.ably.io/channels/${channel}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          name: "event",
          data: event,
        },
      ]),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Ably publish failed", response.status, text);
    }
  } catch (error) {
    console.error("Ably publish failed", error);
  }
}
