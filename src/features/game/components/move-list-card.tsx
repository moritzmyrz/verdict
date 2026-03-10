import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

type MoveRow = {
  number: number;
  white: string;
  black: string;
  key: string;
};

type Props = {
  rows: MoveRow[];
  activePly?: number;
};

export function MoveListCard({ rows, activePly }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Moves</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[18rem] overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No moves yet.</p>
        ) : (
          <ol className="space-y-1.5 text-sm">
            {rows.map((row) => {
              const whitePly = row.number * 2 - 1;
              const blackPly = row.number * 2;
              return (
                <li key={row.key} className="grid grid-cols-[2.2rem_1fr_1fr] gap-2">
                  <span className="text-muted-foreground">{row.number}.</span>
                  <span className={cn("font-mono", activePly === whitePly && "font-semibold text-primary")}>
                    {row.white}
                  </span>
                  <span className={cn("font-mono", activePly === blackPly && "font-semibold text-primary")}>
                    {row.black}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
