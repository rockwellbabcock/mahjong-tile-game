import { useState, useCallback, useEffect } from "react";
import { type Tile, type Suit, type TileValue } from "@shared/schema";

// --- Constants & Helpers ---

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

  // Numbered Suits (1-9, 4 of each)
  SUITS.forEach((suit) => {
    for (let i = 1; i <= 9; i++) {
      addTile(suit, i);
    }
  });

  // Winds (4 of each)
  WINDS.forEach((wind) => {
    addTile("Wind", wind);
  });

  // Dragons (4 of each)
  DRAGONS.forEach((dragon) => {
    addTile("Dragon", dragon);
  });

  // Flowers (8 total)
  addTile("Flower", null, 8);

  // Jokers (8 total)
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

export function useGameLogic() {
  const [deck, setDeck] = useState<Tile[]>([]);
  const [hand, setHand] = useState<Tile[]>([]);
  const [discards, setDiscards] = useState<Tile[]>([]);
  const [phase, setPhase] = useState<"draw" | "discard">("draw");
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [lastDrawnTileId, setLastDrawnTileId] = useState<string | null>(null);

  const initGame = useCallback(() => {
    const newDeck = generateDeck();
    const newHand = newDeck.splice(0, 13);
    
    // Sort initial hand
    newHand.sort(compareTiles);

    setDeck(newDeck);
    setHand(newHand);
    setDiscards([]);
    setPhase("draw"); // Start with a draw
    setSelectedTileId(null);
    setLastDrawnTileId(null);
  }, []);

  // Auto-draw when phase becomes 'draw'
  useEffect(() => {
    if (phase === "draw" && deck.length > 0) {
      // Small delay for visual pacing
      const timer = setTimeout(() => {
        const newDeck = [...deck];
        const drawnTile = newDeck.shift();
        
        if (drawnTile) {
          setDeck(newDeck);
          setHand(prev => [...prev, drawnTile]);
          setLastDrawnTileId(drawnTile.id);
          setPhase("discard");
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, deck]);

  const discardTile = (tileId: string) => {
    if (phase !== "discard") return;

    const tileIndex = hand.findIndex(t => t.id === tileId);
    if (tileIndex === -1) return;

    const newHand = [...hand];
    const [discardedTile] = newHand.splice(tileIndex, 1);

    // Sort hand after discard to keep it tidy, or keep it as is?
    // American MJ players usually keep hands sorted. 
    // Let's NOT auto-sort on discard to prevent jarring jumps, 
    // but we will provide a manual sort button.
    
    setHand(newHand);
    setDiscards(prev => [discardedTile, ...prev]); // Add to front for visual stack
    setPhase("draw");
    setSelectedTileId(null);
    setLastDrawnTileId(null);
  };

  const sortHand = () => {
    setHand(prev => [...prev].sort(compareTiles));
  };

  return {
    deck,
    hand,
    discards,
    phase,
    lastDrawnTileId,
    initGame,
    discardTile,
    sortHand,
  };
}

// Helper to sort tiles logically
function compareTiles(a: Tile, b: Tile): number {
  const suitOrder: Record<string, number> = { 
    Joker: 0, Flower: 1, Dragon: 2, Wind: 3, Bam: 4, Crak: 5, Dot: 6 
  };
  
  if (suitOrder[a.suit] !== suitOrder[b.suit]) {
    return suitOrder[a.suit] - suitOrder[b.suit];
  }

  // If same suit, sort by value
  if (typeof a.value === "number" && typeof b.value === "number") {
    return a.value - b.value;
  }
  
  // String values (Dragons/Winds)
  if (typeof a.value === "string" && typeof b.value === "string") {
    return a.value.localeCompare(b.value);
  }

  return 0;
}
