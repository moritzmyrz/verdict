"use client";

import { Chess, type PieceSymbol, type Square } from "chess.js";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

type Props = {
  fen: string;
  canMove: boolean;
  orientation: "white" | "black";
  onMove: (move: { from: string; to: string; promotion?: "q" | "r" | "b" | "n" }) => void;
};

function pieceAsset(type: PieceSymbol, color: "w" | "b") {
  const colorSuffix = color === "w" ? "w" : "b";
  const map: Record<PieceSymbol, string> = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };
  return `/chess/pieces/${map[type]}-${colorSuffix}.svg`;
}

function getPiece(chess: Chess, square: string) {
  return chess.get(square as Square);
}

function isPromotionMove(from: string, to: string, pieceType: PieceSymbol) {
  if (pieceType !== "p") {
    return false;
  }

  const destinationRank = Number(to[1]);
  return destinationRank === 1 || destinationRank === 8;
}

export function Chessboard({ fen, canMove, orientation, onMove }: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const [selected, setSelected] = useState<string | null>(null);
  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const ranks = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const legalTargets = useMemo(() => {
    if (!selected) {
      return new Set<string>();
    }

    return new Set(
      chess
        .moves({
          square: selected as Square,
          verbose: true,
        })
        .map((move) => move.to),
    );
  }, [chess, selected]);

  useEffect(() => {
    setSelected(null);
  }, [fen]);

  const checkedKingSquare = useMemo(() => {
    if (!chess.inCheck()) {
      return null;
    }

    const checkedColor = chess.turn();
    const board = chess.board();
    for (let rankIndex = 0; rankIndex < board.length; rankIndex++) {
      const row = board[rankIndex];
      if (!row) continue;
      for (let fileIndex = 0; fileIndex < row.length; fileIndex++) {
        const piece = row[fileIndex];
        if (piece?.type === "k" && piece.color === checkedColor) {
          const file = FILES[fileIndex];
          const rank = 8 - rankIndex;
          return `${file}${rank}`;
        }
      }
    }
    return null;
  }, [chess]);

  return (
    <div
      className="grid grid-cols-8 overflow-hidden rounded-xl border border-border"
    >
      {ranks.map((rank) =>
        files.map((file, fileIdx) => {
          const square = `${file}${rank}`;
          const piece = getPiece(chess, square);
          const isSelected = selected === square;
          const isLegalTarget = legalTargets.has(square);
          const isDark = (rank + fileIdx) % 2 === 0;
          const isCheckedKing = checkedKingSquare === square;
          const canSelectPiece = !!piece && piece.color === chess.turn();

          return (
            <button
              key={square}
              type="button"
              className={`relative flex aspect-square items-center justify-center transition-colors ${
                isDark ? "bg-zinc-500/95" : "bg-zinc-200"
              } ${
                isSelected ? "bg-blue-500/25" : ""
              } ${isLegalTarget ? "bg-emerald-500/20" : ""} ${isCheckedKing ? "bg-red-500/35" : ""}`}
              onClick={() => {
                if (!canMove) return;

                if (selected && isLegalTarget) {
                  const selectedPiece = getPiece(chess, selected);
                  const promotion =
                    selectedPiece && isPromotionMove(selected, square, selectedPiece.type)
                      ? "q"
                      : undefined;
                  onMove({ from: selected, to: square, promotion });
                  setSelected(null);
                  return;
                }

                if (selected === square) {
                  setSelected(null);
                  return;
                }

                if (canSelectPiece) {
                  setSelected(square);
                  return;
                }

                setSelected(null);
              }}
            >
              {piece ? (
                <Image
                  src={pieceAsset(piece.type, piece.color)}
                  alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                  width={76}
                  height={76}
                  className="pointer-events-none m-auto h-[78%] w-[78%] select-none drop-shadow-md"
                />
              ) : null}

              {isLegalTarget && !piece ? (
                <span className="pointer-events-none absolute size-3 rounded-full bg-foreground/35" />
              ) : null}

              {isLegalTarget && piece ? (
                <span className="pointer-events-none absolute inset-1 rounded-full border-2 border-foreground/35" />
              ) : null}

              {(rank === ranks[ranks.length - 1] || fileIdx === 0) && (
                <span className="pointer-events-none absolute bottom-1 left-1 text-[10px] font-medium text-foreground/70">
                  {fileIdx === 0 ? rank : ""}
                  {rank === ranks[ranks.length - 1] ? file : ""}
                </span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
