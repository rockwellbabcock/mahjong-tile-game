import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info } from "lucide-react";

interface TermDefinition {
  short: string;
  detail: string;
  learnMore?: string;
}

const GAME_TERMS: Record<string, TermDefinition> = {
  wall: {
    short: "The face-down tiles you draw from each turn.",
    detail: "The wall is the stack of remaining tiles. Each turn, you draw one tile from the wall. When the wall is empty, the game ends in a draw if nobody has won yet.",
  },
  discard: {
    short: "Remove an unwanted tile from your hand.",
    detail: "After drawing a tile, you must discard one tile to get back to 13. Choose wisely \u2014 discard tiles that don't fit any winning pattern. Other players can see your discards.",
  },
  hand: {
    short: "The tiles you're holding (13-14 tiles).",
    detail: "You start with 13 tiles. Each turn you draw a 14th tile, then discard one back down to 13. Your goal is to arrange 14 tiles into a winning pattern.",
  },
  mahjong: {
    short: "A winning hand \u2014 you've matched a pattern!",
    detail: "When your 14 tiles match one of the valid winning patterns, you declare Mahjong and win the game. Patterns include runs, pairs, triples, and special combinations.",
  },
  pair: {
    short: "Two identical tiles.",
    detail: "A pair is two tiles with the same suit and value. For example, two Bam 3 tiles. Many winning patterns require one or more pairs.",
  },
  triple: {
    short: "Three identical tiles (also called a pung).",
    detail: "A triple, or pung, is three tiles with the same suit and value. Triples are key building blocks in many winning patterns.",
  },
  joker: {
    short: "A wild tile that substitutes for any tile.",
    detail: "American Mahjong uses 8 Joker tiles. A Joker can stand in for any tile you're missing to complete a pattern. They're very valuable!",
  },
  flower: {
    short: "A bonus tile used in certain patterns.",
    detail: "There are 8 Flower tiles in American Mahjong. They don't belong to any numbered suit but are required by certain winning patterns.",
  },
  suit: {
    short: "The type of tile (Bam, Crak, or Dot).",
    detail: "There are three main suits: Bam (bamboo), Crak (characters), and Dot (circles). Each suit has tiles numbered 1 through 9, with four copies of each.",
  },
  charleston: {
    short: "Pre-game tile exchange between players.",
    detail: "The Charleston is a tile-passing ceremony before play begins. Players pass unwanted tiles to other players, giving everyone a chance to improve their starting hand.",
  },
  draw: {
    short: "Take one tile from the wall.",
    detail: "Drawing means taking the next tile from the wall and adding it to your hand. This happens automatically at the start of each turn, bringing your hand to 14 tiles.",
  },
  pattern: {
    short: "A specific tile arrangement that wins.",
    detail: "Winning patterns define which combinations of tiles make a valid Mahjong hand. Patterns include consecutive runs, matching pairs, triples, and special combinations using winds, dragons, and flowers.",
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
    <span className="inline-flex items-center gap-0.5">
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className="border-b border-dashed border-muted-foreground/40 cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
          <p className="font-semibold mb-0.5 capitalize">{term}</p>
          <p>{definition.short}</p>
        </TooltipContent>
      </Tooltip>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center justify-center cursor-pointer text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            data-testid={`info-${term.toLowerCase()}`}
            aria-label={`Learn more about ${term}`}
          >
            <Info className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-72 p-3" data-testid={`popover-${term.toLowerCase()}`}>
          <p className="font-semibold text-sm capitalize mb-1">{term}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{definition.detail}</p>
        </PopoverContent>
      </Popover>
    </span>
  );
}
