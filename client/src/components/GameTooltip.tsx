import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

const GAME_TERMS: Record<string, string> = {
  wall: "The stack of face-down tiles you draw from each turn. When it's empty, the game ends in a draw.",
  discard: "A tile you remove from your hand. You must discard one tile each turn to get back to 13 tiles.",
  hand: "The tiles you hold. You start with 13 and draw a 14th each turn, then discard back down to 13.",
  mahjong: "A winning hand! When your 14 tiles match one of the winning patterns, you've won the game.",
  pair: "Two identical tiles (same suit and number).",
  triple: "Three identical tiles (same suit and number). Also called a pung.",
  joker: "A wild tile that can stand in for any tile you're missing. American MahJong uses 8 jokers.",
  flower: "A bonus tile. American MahJong has 8 flowers. They're used in certain winning patterns.",
  suit: "The type of tile. There are three main suits: Bam (bamboo), Crak (characters), and Dot (circles).",
  charleston: "A pre-game tile exchange where players pass tiles to each other. This helps you build your hand before play begins.",
  draw: "Taking one tile from the wall to add to your hand.",
  pattern: "A specific arrangement of tiles that makes a winning hand. Each year, a new card lists the valid patterns.",
};

interface GameTooltipProps {
  term: string;
  children: React.ReactNode;
}

export function GameTooltip({ term, children }: GameTooltipProps) {
  const definition = GAME_TERMS[term.toLowerCase()];
  if (!definition) return <>{children}</>;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 border-b border-dashed border-muted-foreground/40 cursor-help">
          {children}
          <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[250px] text-xs leading-relaxed">
        <p className="font-bold mb-0.5 capitalize">{term}</p>
        <p>{definition}</p>
      </TooltipContent>
    </Tooltip>
  );
}
