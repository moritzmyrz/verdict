import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatPlayerIdentity, type GameParticipantView, type PlayerColor } from "../view-model";

type Props = {
  status: string;
  rated: boolean;
  timeControlLabel: string;
  timeClassLabel: string;
  turnColor?: PlayerColor;
  checkedColor?: PlayerColor | null;
  white?: GameParticipantView;
  black?: GameParticipantView;
  terminationReason?: string | null;
};

export function GameMetaCard({
  status,
  rated,
  timeControlLabel,
  timeClassLabel,
  turnColor,
  checkedColor,
  white,
  black,
  terminationReason,
}: Props) {
  const turnPlayer = turnColor === "white" ? white : turnColor === "black" ? black : undefined;
  const checkedPlayer =
    checkedColor === "white" ? white : checkedColor === "black" ? black : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Game</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">
            {timeClassLabel} · {timeControlLabel}
          </p>
          <Badge variant={rated ? "default" : "secondary"}>{rated ? "Rated" : "Casual"}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{status}</Badge>
          {turnColor ? <Badge variant="secondary">Turn: {formatPlayerIdentity(turnPlayer)}</Badge> : null}
          {checkedColor ? (
            <Badge variant="destructive">Check: {formatPlayerIdentity(checkedPlayer)}</Badge>
          ) : null}
          {terminationReason ? <Badge variant="secondary">{terminationReason}</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}
