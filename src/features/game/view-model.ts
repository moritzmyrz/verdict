export type PlayerColor = "white" | "black";
export type ViewerRole = PlayerColor | "spectator";

export type GameParticipantView = {
  userId: string;
  color: PlayerColor;
  displayName?: string;
  rating?: number | null;
  remainingMsLive?: number;
  user?: {
    name?: string | null;
    image?: string | null;
  } | null;
};

export type BoardSeat = "top" | "bottom";

export type SeatPlayer = {
  seat: BoardSeat;
  color: PlayerColor;
  player: GameParticipantView | undefined;
  isLocalPlayer: boolean;
};

export type GameViewModel = {
  viewerRole: ViewerRole;
  isParticipant: boolean;
  boardOrientation: PlayerColor;
  topColor: PlayerColor;
  bottomColor: PlayerColor;
  topPlayer: SeatPlayer;
  bottomPlayer: SeatPlayer;
};

type Args = {
  participants: GameParticipantView[];
  currentUserId: string;
  spectatorOrientation: PlayerColor;
};

export function deriveGameViewModel(args: Args): GameViewModel {
  const me = args.participants.find((participant) => participant.userId === args.currentUserId);
  const viewerRole: ViewerRole = me?.color ?? "spectator";
  const boardOrientation: PlayerColor =
    viewerRole === "spectator" ? args.spectatorOrientation : viewerRole;
  const topColor: PlayerColor = boardOrientation === "white" ? "black" : "white";
  const bottomColor: PlayerColor = boardOrientation === "white" ? "white" : "black";

  const byColor = {
    white: args.participants.find((participant) => participant.color === "white"),
    black: args.participants.find((participant) => participant.color === "black"),
  };

  return {
    viewerRole,
    isParticipant: viewerRole !== "spectator",
    boardOrientation,
    topColor,
    bottomColor,
    topPlayer: {
      seat: "top",
      color: topColor,
      player: byColor[topColor],
      isLocalPlayer: me?.color === topColor,
    },
    bottomPlayer: {
      seat: "bottom",
      color: bottomColor,
      player: byColor[bottomColor],
      isLocalPlayer: me?.color === bottomColor,
    },
  };
}

export function formatPlayerName(player: GameParticipantView | undefined) {
  if (!player) {
    return "Waiting for player";
  }

  return player.displayName ?? player.user?.name ?? "Player";
}

export function formatPlayerIdentity(player: GameParticipantView | undefined) {
  if (!player) {
    return "Waiting for player";
  }

  const name = formatPlayerName(player);
  const rating = player.rating ?? 1200;
  return `${name} (${rating})`;
}
