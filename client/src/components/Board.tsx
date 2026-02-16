import { motion, AnimatePresence } from "framer-motion";
import { type Tile as TileType } from "@shared/schema";
import { Tile, TileBack } from "./Tile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, ArrowUpDown } from "lucide-react";

interface BoardProps {
  deckCount: number;
  discards: TileType[];
  hand: TileType[];
  phase: "draw" | "discard";
  lastDrawnTileId: string | null;
  onDiscard: (id: string) => void;
  onSort: () => void;
  onReset: () => void;
}

export function Board({
  deckCount,
  discards,
  hand,
  phase,
  lastDrawnTileId,
  onDiscard,
  onSort,
  onReset,
}: BoardProps) {
  const drawnTile = lastDrawnTileId
    ? hand.find(t => t.id === lastDrawnTileId)
    : null;

  const mainHand = drawnTile
    ? hand.filter(t => t.id !== lastDrawnTileId)
    : hand;

  return (
    <div className="flex h-[100dvh] w-full" data-testid="game-board">
      {/* Left: Main game area (hand + wall info) */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Bar */}
        <header className="flex items-center justify-between gap-2 p-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-3">
            <TileBack count={deckCount} />
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider" data-testid="text-wall-label">Wall</h2>
              <p className="text-xl font-bold text-foreground" data-testid="text-wall-count">{deckCount} tiles</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-3 py-1 rounded-md text-xs font-bold border ${
                phase === "discard"
                  ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
                  : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
              }`}
              data-testid="text-phase"
            >
              {phase === "discard" ? "Click a tile to discard" : "Drawing..."}
            </span>
            <Button variant="outline" size="sm" onClick={onSort} data-testid="button-sort">
              <ArrowUpDown className="w-4 h-4 mr-1" />
              Sort
            </Button>
            <Button variant="outline" size="sm" onClick={onReset} data-testid="button-reset">
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </header>

        {/* Center area - empty table feel */}
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-muted-foreground text-sm">Click a tile in your hand below to discard it</p>
        </div>

        {/* Bottom: Player Hand */}
        <footer className="border-t border-border p-4" data-testid="player-hand-area">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 text-center" data-testid="text-hand-label">
            Your Hand ({hand.length} tiles)
          </h3>

          <div className="flex items-end justify-center gap-2 w-full overflow-x-auto pb-2">
            {/* Main Hand */}
            <div className="flex items-center justify-center gap-1 p-3 bg-card rounded-md border border-card-border" data-testid="hand-main">
              {mainHand.map((tile) => (
                <Tile
                  key={tile.id}
                  tile={tile}
                  isInteractive={phase === "discard"}
                  onClick={() => onDiscard(tile.id)}
                />
              ))}
            </div>

            {/* Drawn Tile (separated visually) */}
            <AnimatePresence>
              {drawnTile && (
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="ml-3 flex items-center justify-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-md border border-orange-200 dark:border-orange-800 relative"
                  data-testid="hand-drawn-tile"
                >
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900 px-2 py-0.5 rounded-md whitespace-nowrap border border-orange-200 dark:border-orange-700">
                    NEW
                  </span>
                  <Tile
                    tile={drawnTile}
                    isInteractive={phase === "discard"}
                    isRecent
                    onClick={() => onDiscard(drawnTile.id)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </footer>
      </div>

      {/* Right: Discard Pile */}
      <aside className="w-64 md:w-72 lg:w-80 border-l border-border flex flex-col bg-card" data-testid="discard-pile-area">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider" data-testid="text-discard-label">
            Discarded Tiles
          </h3>
          <p className="text-xs text-muted-foreground" data-testid="text-discard-count">
            {discards.length} tile{discards.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3" data-testid="discard-pile-list">
          {discards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
              <p className="text-sm italic">No discards yet</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 content-start">
              {discards.map((tile, i) => (
                <motion.div
                  key={tile.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid={`discard-tile-${i}`}
                >
                  <Tile tile={tile} size="sm" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
