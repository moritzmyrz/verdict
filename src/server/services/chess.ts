import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";

export const START_FEN = "start";
export const WIN_SCORE = 1;
export const DRAW_SCORE = 0.5;
export const LOSS_SCORE = 0;

export type GameTermination =
  | "checkmate"
  | "stalemate"
  | "draw_agreement"
  | "threefold"
  | "fifty_move"
  | "timeout"
  | "resignation"
  | "aborted";

export function createChessFromFen(fen: string) {
  if (fen === START_FEN) {
    return new Chess();
  }
  return new Chess(fen);
}

export function getUciMove(from: string, to: string, promotion?: PieceSymbol) {
  return `${from}${to}${promotion ?? ""}`;
}

export function getGameTermination(chess: Chess): GameTermination | null {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isThreefoldRepetition()) return "threefold";
  if (chess.isDrawByFiftyMoves()) return "fifty_move";
  return null;
}

export function getResultFromTurn(turn: Color) {
  return turn === "w" ? "black_win" : "white_win";
}

export function colorToTurn(color: "white" | "black"): Color {
  return color === "white" ? "w" : "b";
}

export function turnToColor(turn: Color): "white" | "black" {
  return turn === "w" ? "white" : "black";
}

export function getBoardMatrix(chess: Chess) {
  const board = chess.board();
  return board.map((row) =>
    row.map((square) =>
      square
        ? ({
            color: square.color,
            type: square.type,
            square: square.square,
          } as {
            color: Color;
            type: PieceSymbol;
            square: Square;
          })
        : null,
    ),
  );
}
