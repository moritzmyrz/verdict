import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type Props = {
  isParticipant: boolean;
  gameStatus?: string;
  drawOfferedByOther: boolean;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onRequestRematch: () => void;
  resignPending: boolean;
  drawOfferPending: boolean;
  drawResponsePending: boolean;
  rematchPending: boolean;
};

export function GameActionsCard({
  isParticipant,
  gameStatus,
  drawOfferedByOther,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onRequestRematch,
  resignPending,
  drawOfferPending,
  drawResponsePending,
  rematchPending,
}: Props) {
  const isActive = gameStatus === "active";
  const isFinished = gameStatus === "finished";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isParticipant ? (
          <p className="text-sm text-muted-foreground">Spectators cannot play actions in this game.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onOfferDraw} disabled={drawOfferPending || !isActive}>
                Offer draw
              </Button>
              <Button variant="destructive" onClick={onResign} disabled={resignPending || !isActive}>
                Resign
              </Button>
            </div>
            {drawOfferedByOther ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={onAcceptDraw} disabled={drawResponsePending}>
                  Accept draw
                </Button>
                <Button variant="outline" onClick={onDeclineDraw} disabled={drawResponsePending}>
                  Decline draw
                </Button>
              </div>
            ) : null}
            {isFinished ? (
              <Button variant="outline" onClick={onRequestRematch} disabled={rematchPending}>
                Request rematch
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
