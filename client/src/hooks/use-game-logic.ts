import { useState, useCallback, useEffect, useRef } from "react";
import { type Tile, type Suit, type TileValue } from "@shared/schema";
import { checkForWin, getHints, type PatternMatch } from "@/lib/patterns";

const SUITS: Suit[] = ["Bam", "Crak", "Dot"];
const WINDS: TileValue[] = ["East", "South", "West", "North"];
const DRAGONS: TileValue[] = ["Red", "Green", "White"];

function generateDeck(): Tile[] {
  const deck: Tile[] = [];
  let idCounter = 1;

  const addTile = (suit: Suit, value: TileValue, count: number = 4) => {
    for (let i = 0; i < count; i++) {
      deck.push({
        id: `${suit}-${value}-${i}-${idCounter++}`,
        suit,
        value,
        isJoker: suit === "Joker",
      });
    }
  };

  SUITS.forEach((suit) => {
    for (let i = 1; i <= 9; i++) {
      addTile(suit, i);
    }
  });

  WINDS.forEach((wind) => {
    addTile("Wind", wind);
  });

  DRAGONS.forEach((dragon) => {
    addTile("Dragon", dragon);
  });

  ["Plum", "Orchid", "Chrysanthemum", "Bamboo"].forEach((name) => {
    addTile("Flower", name, 1);
  });
  ["Spring", "Summer", "Fall", "Winter"].forEach((name) => {
    addTile("Flower", name, 1);
  });
  addTile("Joker", null, 8);

  return shuffle(deck);
}

function shuffle(array: Tile[]): Tile[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function compareTiles(a: Tile, b: Tile): number {
  const suitOrder: Record<string, number> = {
    Joker: 0, Flower: 1, Dragon: 2, Wind: 3, Bam: 4, Crak: 5, Dot: 6,
  };

  if (suitOrder[a.suit] !== suitOrder[b.suit]) {
    return suitOrder[a.suit] - suitOrder[b.suit];
  }

  if (typeof a.value === "number" && typeof b.value === "number") {
    return a.value - b.value;
  }

  if (typeof a.value === "string" && typeof b.value === "string") {
    return a.value.localeCompare(b.value);
  }

  return 0;
}

export function useGameLogic() {
  const [deck, setDeck] = useState<Tile[]>([]);
  const [hand, setHand] = useState<Tile[]>([]);
  const [discards, setDiscards] = useState<Tile[]>([]);
  const [phase, setPhase] = useState<"draw" | "discard" | "won">("draw");
  const [lastDrawnTileId, setLastDrawnTileId] = useState<string | null>(null);
  const [winResult, setWinResult] = useState<PatternMatch | null>(null);
  const [showHints, setShowHints] = useState(false);
  const drawCounterRef = useRef(0);

  const initGame = useCallback(() => {
    const newDeck = generateDeck();
    const newHand = newDeck.splice(0, 13);
    newHand.sort(compareTiles);

    drawCounterRef.current += 1;

    setDeck(newDeck);
    setHand(newHand);
    setDiscards([]);
    setLastDrawnTileId(null);
    setWinResult(null);
    setShowHints(false);
    setPhase("draw");
  }, []);

  useEffect(() => {
    if (phase !== "draw" || deck.length === 0) return;

    const capturedCounter = drawCounterRef.current;
    const timer = setTimeout(() => {
      if (drawCounterRef.current !== capturedCounter) return;

      setDeck(prevDeck => {
        const newDeck = [...prevDeck];
        const drawnTile = newDeck.shift();
        if (!drawnTile) return prevDeck;

        setHand(prevHand => {
          const newHand = [...prevHand, drawnTile];

          const win = checkForWin(newHand);
          if (win) {
            setWinResult(win);
            setPhase("won");
          } else {
            setPhase("discard");
          }

          setLastDrawnTileId(drawnTile.id);
          return newHand;
        });

        return newDeck;
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [phase, deck.length]);

  const discardTile = useCallback((tileId: string) => {
    setHand(prevHand => {
      const tileIndex = prevHand.findIndex(t => t.id === tileId);
      if (tileIndex === -1) return prevHand;

      const newHand = [...prevHand];
      const [discardedTile] = newHand.splice(tileIndex, 1);
      setDiscards(prev => [discardedTile, ...prev]);
      setLastDrawnTileId(null);
      drawCounterRef.current += 1;
      setPhase("draw");
      return newHand;
    });
  }, []);

  const sortHand = useCallback(() => {
    setHand(prev => [...prev].sort(compareTiles));
  }, []);

  const toggleHints = useCallback(() => {
    setShowHints(prev => !prev);
  }, []);

  const hints = hand.length > 0 ? getHints(hand) : null;

  return {
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
  };
}
