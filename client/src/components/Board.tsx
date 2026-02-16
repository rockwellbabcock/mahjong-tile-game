import { motion, AnimatePresence } from "framer-motion";
import { type Tile as TileType } from "@shared/schema";
import { type PatternMatch } from "@/lib/patterns";
import { Tile, TileBack } from "./Tile";
import { HintPanel } from "./HintPanel";
import { GameTooltip } from "./GameTooltip";
import { Button } from "@/components/ui/button";
import { RotateCcw, ArrowUpDown, Lightbulb, Palette, Trophy } from "lucide-react";
import { useTileStyle } from "@/hooks/use-tile-style";

interface BoardProps {
  deckCount: number;
  discards: TileType[];
  hand: TileType[];
  phase: "draw" | "discard" | "won";
  lastDrawnTileId: string | null;
  showHints: boolean;
  hints: {
    closest: PatternMatch[];
    bestHint: string;
    tilesAway: number;
  } | null;
  onDiscard: (id: string) => void;
  onSort: () => void;
  onReset: () => void;
  onToggleHints: () => void;
  onTestWin: () => void;
}

export function Board({
  deckCount,
  discards,
  hand,
  phase,
  lastDrawnTileId,
  showHints,
  hints,
  onDiscard,
  onSort,
  onReset,
  onToggleHints,
  onTestWin,
}: BoardProps) {
  const drawnTile = lastDrawnTileId
    ? hand.find(t => t.id === lastDrawnTileId)
    : null;

  const mainHand = drawnTile
    ? hand.filter(t => t.id !== lastDrawnTileId)
    : hand;

  const { tileStyle, cycleTileStyle } = useTileStyle();

  function getStatusMessage() {
    if (phase === "won") return "You won! Great job!";
    if (phase === "draw") return "Drawing a tile from the wall...";
    if (deckCount === 0) return "The wall is empty. Game over!";
    return "Your turn - pick a tile from your hand to discard it.";
  }

  return (
    <div className="flex h-[100dvh] w-full" data-testid="game-board">
      <div className="flex-1 flex flex-col min-w-0">

        {/* Status Bar */}
        <div
          className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 font-medium text-center"
          data-testid="status-bar"
        >
          {getStatusMessage()}
        </div>

        {/* Top Bar */}
        <header className="flex items-center justify-between gap-2 p-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-3">
            <TileBack count={deckCount} />
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider" data-testid="text-wall-label">
                <GameTooltip term="wall">Wall</GameTooltip>
              </h2>
              <p className="text-xl font-bold text-foreground" data-testid="text-wall-count">{deckCount} tiles</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-3 py-1 rounded-md text-xs font-bold border ${
                phase === "discard"
                  ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
                  : phase === "won"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
              }`}
              data-testid="text-phase"
            >
              {phase === "discard" ? "Your turn: discard a tile" : phase === "won" ? "Mahjong!" : "Drawing..."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleHints}
              className={showHints ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" : ""}
              data-testid="button-hint"
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              Hint
            </Button>
            <Button variant="outline" size="sm" onClick={onSort} data-testid="button-sort">
              <ArrowUpDown className="w-4 h-4 mr-1" />
              Sort
            </Button>
            <Button variant="outline" size="sm" onClick={onReset} data-testid="button-reset">
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={onTestWin} data-testid="button-test-win">
              <Trophy className="w-4 h-4 mr-1" />
              Test Win
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={cycleTileStyle}
              data-testid="button-tile-style"
            >
              <Palette className="w-4 h-4 mr-1" />
              {tileStyle === "classic" ? "Classic" : tileStyle === "emoji" ? "Modern" : "Text"}
            </Button>
          </div>
        </header>

        {/* Center area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 overflow-y-auto">
          <AnimatePresence>
            {showHints && hints && (
              <div className="w-full max-w-lg">
                <HintPanel
                  closest={hints.closest}
                  bestHint={hints.bestHint}
                  tilesAway={hints.tilesAway}
                />
              </div>
            )}
          </AnimatePresence>

          {!showHints && (
            <p className="text-muted-foreground text-sm">
              Click a tile in your <GameTooltip term="hand">hand</GameTooltip> below to <GameTooltip term="discard">discard</GameTooltip> it.
              Use the <GameTooltip term="pattern">Hint</GameTooltip> button to see how close you are to <GameTooltip term="mahjong">Mahjong</GameTooltip>.
            </p>
          )}
        </div>

        {/* Bottom: Player Hand */}
        <footer className="border-t border-border p-4" data-testid="player-hand-area">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 text-center" data-testid="text-hand-label">
            Your <GameTooltip term="hand">Hand</GameTooltip> ({hand.length} tiles)
          </h3>

          <div className="flex items-end justify-center gap-2 w-full overflow-x-auto pb-2">
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
            <GameTooltip term="discard">Discarded Tiles</GameTooltip>
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
