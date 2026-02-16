import { type Tile, type Suit, type TileValue } from "@shared/schema";

export interface PatternMatch {
  patternId: string;
  patternName: string;
  description: string;
  isComplete: boolean;
  tilesAway: number;
  matched: string[];
  missing: string[];
  hint: string;
}

type TileKey = string;

function tileKey(suit: Suit, value: TileValue): TileKey {
  return `${suit}-${value}`;
}

interface RequiredTile {
  suit: Suit | "any-dragon" | "any-flower";
  value: TileValue;
  count: number;
  label: string;
}

interface ConcretePattern {
  id: string;
  name: string;
  description: string;
  required: RequiredTile[];
}

const NUMBERED_SUITS: Suit[] = ["Bam", "Crak", "Dot"];
const DRAGON_VALUES: TileValue[] = ["Red", "Green", "White"];

function buildConcretePatterns(): ConcretePattern[] {
  const patterns: ConcretePattern[] = [];

  for (const suit of NUMBERED_SUITS) {
    patterns.push({
      id: `consec-run-low-${suit}`,
      name: `Low Consecutive Run (${suit})`,
      description: `Pairs of 1-2-3-4, a triple of 5, and a pair of 6 in ${suit} (14 tiles)`,
      required: [
        { suit, value: 1, count: 2, label: `${suit} 1` },
        { suit, value: 2, count: 2, label: `${suit} 2` },
        { suit, value: 3, count: 2, label: `${suit} 3` },
        { suit, value: 4, count: 2, label: `${suit} 4` },
        { suit, value: 5, count: 3, label: `${suit} 5` },
        { suit, value: 6, count: 3, label: `${suit} 6` },
      ],
    });

    patterns.push({
      id: `consec-run-high-${suit}`,
      name: `High Consecutive Run (${suit})`,
      description: `A triple of 4, pairs of 5-6-7-8, and a triple of 9 in ${suit} (14 tiles)`,
      required: [
        { suit, value: 4, count: 3, label: `${suit} 4` },
        { suit, value: 5, count: 2, label: `${suit} 5` },
        { suit, value: 6, count: 2, label: `${suit} 6` },
        { suit, value: 7, count: 2, label: `${suit} 7` },
        { suit, value: 8, count: 2, label: `${suit} 8` },
        { suit, value: 9, count: 3, label: `${suit} 9` },
      ],
    });
  }

  for (const suit of NUMBERED_SUITS) {
    patterns.push({
      id: `2468-${suit}`,
      name: `2-4-6-8 Evens (${suit})`,
      description: `Pairs of 2, 4, 6, 8 in ${suit}, a pair of Flowers, and a pair plus a triple of any Dragon (14 tiles)`,
      required: [
        { suit, value: 2, count: 2, label: `${suit} 2` },
        { suit, value: 4, count: 2, label: `${suit} 4` },
        { suit, value: 6, count: 2, label: `${suit} 6` },
        { suit, value: 8, count: 2, label: `${suit} 8` },
        { suit: "any-flower", value: null, count: 2, label: "Flower" },
        { suit: "any-dragon", value: null, count: 4, label: "any Dragon" },
      ],
    });
  }

  for (const suit of NUMBERED_SUITS) {
    patterns.push({
      id: `seven-pairs-${suit}`,
      name: `Seven Pairs (${suit})`,
      description: `Seven pairs using tiles 1 through 7 in ${suit} (14 tiles)`,
      required: [
        { suit, value: 1, count: 2, label: `${suit} 1` },
        { suit, value: 2, count: 2, label: `${suit} 2` },
        { suit, value: 3, count: 2, label: `${suit} 3` },
        { suit, value: 4, count: 2, label: `${suit} 4` },
        { suit, value: 5, count: 2, label: `${suit} 5` },
        { suit, value: 6, count: 2, label: `${suit} 6` },
        { suit, value: 7, count: 2, label: `${suit} 7` },
      ],
    });
  }

  patterns.push({
    id: "winds-and-dragons",
    name: "Winds & Dragons",
    description: "A pair of each Wind direction plus a triple of any Dragon and a pair of Flowers (14 tiles)",
    required: [
      { suit: "Wind", value: "North", count: 2, label: "North" },
      { suit: "Wind", value: "South", count: 2, label: "South" },
      { suit: "Wind", value: "East", count: 2, label: "East" },
      { suit: "Wind", value: "West", count: 2, label: "West" },
      { suit: "any-dragon", value: null, count: 4, label: "any Dragon" },
      { suit: "any-flower", value: null, count: 2, label: "Flower" },
    ],
  });

  for (const suit of NUMBERED_SUITS) {
    patterns.push({
      id: `1357-${suit}`,
      name: `1-3-5-7-9 Odds (${suit})`,
      description: `Pairs of 1, 3, 5, 7 in ${suit}, a triple of 9, and a triple of any Dragon (14 tiles)`,
      required: [
        { suit, value: 1, count: 2, label: `${suit} 1` },
        { suit, value: 3, count: 2, label: `${suit} 3` },
        { suit, value: 5, count: 2, label: `${suit} 5` },
        { suit, value: 7, count: 2, label: `${suit} 7` },
        { suit, value: 9, count: 3, label: `${suit} 9` },
        { suit: "any-dragon", value: null, count: 3, label: "any Dragon" },
      ],
    });
  }

  for (const suit of NUMBERED_SUITS) {
    patterns.push({
      id: `triple-triple-${suit}`,
      name: `Three Triples (${suit})`,
      description: `Triples of 1, 5, and 9 in ${suit}, plus a pair of Flowers and a triple of any Dragon (14 tiles)`,
      required: [
        { suit, value: 1, count: 3, label: `${suit} 1` },
        { suit, value: 5, count: 3, label: `${suit} 5` },
        { suit, value: 9, count: 3, label: `${suit} 9` },
        { suit: "any-flower", value: null, count: 2, label: "Flower" },
        { suit: "any-dragon", value: null, count: 3, label: "any Dragon" },
      ],
    });
  }

  return patterns;
}

const ALL_PATTERNS = buildConcretePatterns();

function getAnyDragonCount(hand: Tile[]): number {
  return hand.filter(t => t.suit === "Dragon").length;
}

function checkPatternMatch(hand: Tile[], pattern: ConcretePattern): PatternMatch {
  const counts = new Map<TileKey, number>();
  for (const t of hand) {
    const k = tileKey(t.suit, t.value);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const jokerCount = hand.filter(t => t.suit === "Joker").length;
  const totalDragons = getAnyDragonCount(hand);
  const totalFlowers = hand.filter(t => t.suit === "Flower").length;

  let totalRequired = 0;
  let totalHave = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  let jokersLeft = jokerCount;

  let anyDragonsUsed = 0;
  let anyFlowersUsed = 0;

  for (const req of pattern.required) {
    const need = req.count;
    totalRequired += need;

    let have = 0;

    if (req.suit === "any-dragon") {
      have = Math.max(0, totalDragons - anyDragonsUsed);
      anyDragonsUsed += Math.min(have, need);
    } else if (req.suit === "any-flower") {
      have = Math.max(0, totalFlowers - anyFlowersUsed);
      anyFlowersUsed += Math.min(have, need);
    } else {
      const k = tileKey(req.suit as Suit, req.value);
      have = counts.get(k) || 0;
    }

    const used = Math.min(have, need);
    let gap = need - used;

    const jokerFill = Math.min(gap, jokersLeft);
    jokersLeft -= jokerFill;
    gap -= jokerFill;

    totalHave += used + jokerFill;

    if (gap === 0) {
      matched.push(`${need}x ${req.label}`);
    } else {
      missing.push(`${gap} more ${req.label}`);
    }
  }

  const tilesAway = totalRequired - totalHave;
  const isComplete = tilesAway === 0 && hand.length === 14 && totalRequired === 14;

  let hint = "";
  if (isComplete) {
    hint = `You have a winning hand! This is the "${pattern.name}" pattern.`;
  } else if (tilesAway <= 3) {
    hint = `Almost there! You need: ${missing.join(", ")}.`;
  } else {
    hint = `You need ${tilesAway} tiles: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}.`;
  }

  return {
    patternId: pattern.id,
    patternName: pattern.name,
    description: pattern.description,
    isComplete,
    tilesAway,
    matched,
    missing,
    hint,
  };
}

export function checkAllPatterns(hand: Tile[]): PatternMatch[] {
  return ALL_PATTERNS.map(p => checkPatternMatch(hand, p))
    .sort((a, b) => a.tilesAway - b.tilesAway);
}

export function checkForWin(hand: Tile[]): PatternMatch | null {
  if (hand.length !== 14) return null;
  const results = checkAllPatterns(hand);
  return results.find(r => r.isComplete) || null;
}

export function getHints(hand: Tile[]): {
  closest: PatternMatch[];
  bestHint: string;
  tilesAway: number;
} {
  const results = checkAllPatterns(hand);
  const closest = results.filter(r => r.tilesAway <= 6).slice(0, 3);

  if (closest.length === 0) {
    return {
      closest: results.slice(0, 3),
      bestHint: "You're exploring! Try collecting pairs and triples of tiles in the same suit.",
      tilesAway: results[0]?.tilesAway ?? 14,
    };
  }

  const best = closest[0];
  return {
    closest,
    bestHint: best.hint,
    tilesAway: best.tilesAway,
  };
}

export function getPatternCount(): number {
  return ALL_PATTERNS.length;
}
