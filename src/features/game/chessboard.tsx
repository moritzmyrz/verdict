"use client";

import { Chess } from "chess.js";
import { useMemo, useState } from "react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECES: Record<string, string> = {
  p: "♟",
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  P: "♙",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔",
};

type Props = {
  fen: string;
  canMove: boolean;
  onMove: (move: { from: string; to: string; promotion?: "q" | "r" | "b" | "n" }) => void;
};

function pieceAt(chess: Chess, square: string) {
  const piece = chess.get(square as Parameters<Chess["get"]>[0]);
  if (!piece) return null;
  const key = piece.color === "w" ? piece.type.toUpperCase() : piece.type;
  return PIECES[key] ?? null;
}

export function Chessboard({ fen, canMove, onMove }: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-8 overflow-hidden rounded-xl border border-white/10">
      {Array.from({ length: 8 }).map((_, rankIdx) =>
        FILES.map((file, fileIdx) => {
          const rank = 8 - rankIdx;
          const square = `${file}${rank}`;
          const isDark = (rankIdx + fileIdx) % 2 === 1;
          const piece = pieceAt(chess, square);
          const isSelected = selected === square;
          return (
            <button
              key={square}
              type="button"
              className={`flex aspect-square items-center justify-center text-2xl transition ${
                isDark ? "bg-zinc-700" : "bg-zinc-200 text-zinc-900"
              } ${isSelected ? "ring-2 ring-blue-500 ring-inset" : ""}`}
              onClick={() => {
                if (!canMove) return;

                if (!selected) {
                  setSelected(square);
                  return;
                }

                if (selected === square) {
                  setSelected(null);
                  return;
                }

                onMove({ from: selected, to: square });
                setSelected(null);
              }}
            >
              <span className="select-none">{piece}</span>
            </button>
          );
        }),
      )}
    </div>
  );
}
