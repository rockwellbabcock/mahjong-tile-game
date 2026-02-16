import { useEffect } from "react";
import { useGameLogic } from "@/hooks/use-game-logic";
import { Board } from "@/components/Board";
import { motion } from "framer-motion";

export default function GamePage() {
  const {
    deck,
    hand,
    discards,
    phase,
    lastDrawnTileId,
    initGame,
    discardTile,
    sortHand,
  } = useGameLogic();

  // Start game on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Loading state while deck initializes
  if (deck.length === 0 && hand.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-6xl mb-4"
        >
          🀄
        </motion.div>
        <p className="font-display text-xl text-primary font-bold">Shuffling Tiles...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground overflow-hidden">
      <Board
        deckCount={deck.length}
        discards={discards}
        hand={hand}
        phase={phase}
        lastDrawnTileId={lastDrawnTileId}
        onDiscard={discardTile}
        onSort={sortHand}
        onReset={initGame}
      />
    </div>
  );
}
