import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { formatPlayerName, type BoardSeat, type GameParticipantView, type PlayerColor } from "../view-model";

type CapturedPiece = {
  piece: "q" | "r" | "b" | "n" | "p";
  count: number;
};

type Props = {
  seat: BoardSeat;
  color: PlayerColor;
  player: GameParticipantView | undefined;
  isLocalPlayer: boolean;
  isActiveTurn: boolean;
  isLowTime: boolean;
  clockLabel: string;
  captured: CapturedPiece[];
  statusLabel?: string;
};

const PIECE_LABEL: Record<CapturedPiece["piece"], string> = {
  q: "Q",
  r: "R",
  b: "B",
  n: "N",
  p: "P",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return "P";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function PlayerPanel({
  seat,
  color,
  player,
  isLocalPlayer,
  isActiveTurn,
  isLowTime,
  clockLabel,
  captured,
  statusLabel,
}: Props) {
  const displayName = formatPlayerName(player);
  const rating = player?.rating ?? 1200;

  return (
    <Card
      className={cn(
        "border-border/80 transition-colors",
        isActiveTurn && "border-primary/70 ring-1 ring-primary/50",
        isLowTime && "border-destructive/70 ring-1 ring-destructive/50",
      )}
    >
      <CardContent className="flex items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold">
            {player?.user?.image ? (
              // Remote avatar hosts are user-controlled; keep a plain img here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.user.image}
                alt={displayName}
                className="size-10 rounded-full object-cover"
              />
            ) : (
              initials(displayName)
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{displayName}</p>
              <span className="text-sm text-muted-foreground">{rating}</span>
              {isLocalPlayer ? (
                <span className="rounded-md border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  You
                </span>
              ) : null}
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {seat} · {color}
              {statusLabel ? ` · ${statusLabel}` : ""}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden min-w-[5rem] justify-end sm:flex">
            {captured.length > 0 ? (
              <ul className="flex items-center gap-1 text-xs text-muted-foreground">
                {captured.map((item) => (
                  <li key={item.piece} className="rounded border border-border/70 px-1.5 py-0.5">
                    {PIECE_LABEL[item.piece]}x{item.count}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-muted-foreground">No captures</span>
            )}
          </div>
          <div
            className={cn(
              "min-w-[7.2rem] rounded-md border px-2.5 py-1.5 text-right font-mono text-2xl font-semibold tabular-nums sm:min-w-[8rem]",
              isActiveTurn ? "border-primary/70 bg-primary/5 text-primary" : "border-border bg-muted/30",
              isLowTime && "border-destructive/70 bg-destructive/10 text-destructive",
            )}
          >
            {clockLabel}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
