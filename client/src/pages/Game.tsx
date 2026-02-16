import { useEffect } from "react";
import { useGameLogic } from "@/hooks/use-game-logic";
import { Board } from "@/components/Board";
import { WinOverlay } from "@/components/WinOverlay";

export default function GamePage() {
  const {
    deck,
    hand,
    discards,
    phase,
    lastDrawnTileId,
    winResult,
    showHints,
    hints,
    initGame,
    discardTile,
    sortHand,
    toggleHints,
  } = useGameLogic();

  useEffect(() => {
    initGame();
  }, [initGame]);

  if (deck.length === 0 && hand.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <p className="text-xl text-foreground font-bold">Shuffling Tiles...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <Board
        deckCount={deck.length}
        discards={discards}
        hand={hand}
        phase={phase}
        lastDrawnTileId={lastDrawnTileId}
        showHints={showHints}
        hints={hints}
        onDiscard={discardTile}
        onSort={sortHand}
        onReset={initGame}
        onToggleHints={toggleHints}
      />

      {winResult && (
        <WinOverlay result={winResult} onPlayAgain={initGame} />
      )}
    </div>
  );
}
