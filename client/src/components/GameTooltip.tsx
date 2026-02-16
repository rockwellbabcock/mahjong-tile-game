import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info, ExternalLink } from "lucide-react";

interface TermDefinition {
  definition: string;
  learnMoreUrl: string;
  learnMoreLabel: string;
}

const GAME_TERMS: Record<string, TermDefinition> = {
  wall: {
    definition: "The face-down stack of tiles you draw from each turn. When it's empty, the game ends.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "Mahjong Basics",
  },
  discard: {
    definition: "A tile you remove from your hand each turn. Pick tiles that don't fit your winning pattern.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "How Discarding Works",
  },
  hand: {
    definition: "The tiles you're holding. You keep 13 tiles and draw a 14th each turn, then discard one.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "Hand Management",
  },
  mahjong: {
    definition: "A winning hand! When your 14 tiles match a valid pattern, you declare Mahjong and win.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "What is Mahjong?",
  },
  pair: {
    definition: "Two identical tiles with the same suit and value. Many winning patterns need pairs.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "Tile Combinations",
  },
  triple: {
    definition: "Three identical tiles, also called a pung. A key building block in winning patterns.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "Tile Combinations",
  },
  joker: {
    definition: "Wild tile that can substitute for any other tile. American Mahjong uses 8 of them.",
    learnMoreUrl: "https://www.mahjonggcentral.com/jokers",
    learnMoreLabel: "Joker Rules",
  },
  flower: {
    definition: "Special bonus tile used in certain winning patterns. There are 8 in the set.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "About Flowers",
  },
  suit: {
    definition: "The category of a tile. The three main suits are Bam (bamboo), Crak (characters), and Dot (circles).",
    learnMoreUrl: "https://www.mahjonggcentral.com/tiles",
    learnMoreLabel: "Tile Types",
  },
  charleston: {
    definition: "Pass unwanted tiles to other players before the game starts. Helps everyone build better hands.",
    learnMoreUrl: "https://www.mahjonggcentral.com/charleston",
    learnMoreLabel: "Charleston Rules",
  },
  exposure: {
    definition: "Tiles you've revealed to claim from the discard pile. Once exposed, they stay face-up.",
    learnMoreUrl: "https://www.mahjonggcentral.com/exposures",
    learnMoreLabel: "Exposure Rules",
  },
  draw: {
    definition: "Taking the next tile from the wall to add to your hand. Happens at the start of each turn.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "Game Flow",
  },
  pattern: {
    definition: "A specific arrangement of tiles that makes a winning hand. Check the Hint panel to see which you're closest to.",
    learnMoreUrl: "https://www.mahjonggcentral.com/hands",
    learnMoreLabel: "Winning Patterns",
  },
  wind: {
    definition: "Special honor tiles representing North, South, East, and West. Used in certain winning patterns.",
    learnMoreUrl: "https://www.mahjonggcentral.com/tiles",
    learnMoreLabel: "Honor Tiles",
  },
  dragon: {
    definition: "Honor tiles in three colors: Red, Green, and White. Key to several winning patterns.",
    learnMoreUrl: "https://www.mahjonggcentral.com/tiles",
    learnMoreLabel: "Honor Tiles",
  },
  pung: {
    definition: "Three identical tiles. You can claim a discarded tile to complete a pung if you expose it.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "Tile Combinations",
  },
  kong: {
    definition: "Four identical tiles. A powerful set that's hard to collect but scores well.",
    learnMoreUrl: "https://www.mahjonggcentral.com/basics",
    learnMoreLabel: "Tile Combinations",
  },
};

interface GameTooltipProps {
  term: string;
  children: React.ReactNode;
}

export function GameTooltip({ term, children }: GameTooltipProps) {
  const definition = GAME_TERMS[term.toLowerCase()];
  if (!definition) return <>{children}</>;

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-0.5 border-b border-dashed border-muted-foreground/40 cursor-pointer hover:border-muted-foreground transition-colors"
          data-testid={`info-${term.toLowerCase()}`}
          aria-label={`Learn about ${term}`}
        >
          {children}
          <Info className="w-3 h-3 text-muted-foreground/50" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-3" data-testid={`popover-${term.toLowerCase()}`}>
        <p className="font-semibold text-sm capitalize mb-1.5">{term}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2">{definition.definition}</p>
        <a
          href={definition.learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          data-testid={`link-learn-more-${term.toLowerCase()}`}
        >
          {definition.learnMoreLabel}
          <ExternalLink className="w-3 h-3" />
        </a>
      </PopoverContent>
    </Popover>
  );
}
