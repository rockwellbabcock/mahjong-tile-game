import { motion } from "framer-motion";
import { type Tile as TileType } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TileProps {
  tile: TileType;
  onClick?: () => void;
  isInteractive?: boolean;
  isRecent?: boolean;
  size?: "sm" | "md" | "lg";
}

const suitColors: Record<string, string> = {
  Bam: "text-emerald-700 border-emerald-300 bg-emerald-50",
  Crak: "text-red-700 border-red-300 bg-red-50",
  Dot: "text-blue-700 border-blue-300 bg-blue-50",
  Wind: "text-slate-800 border-slate-300 bg-slate-50",
  Dragon: "text-slate-900 border-slate-300 bg-slate-50",
  Flower: "text-fuchsia-700 border-fuchsia-300 bg-fuchsia-50",
  Joker: "text-amber-700 border-amber-300 bg-amber-50",
};

const numberEmojis: Record<number, string> = {
  1: "\u4E00", 2: "\u4E8C", 3: "\u4E09", 4: "\u56DB",
  5: "\u4E94", 6: "\u516D", 7: "\u4E03", 8: "\u516B", 9: "\u4E5D",
};

const suitSymbols: Record<string, string> = {
  Bam: "\uD83C\uDF8D",
  Crak: "\uD83C\uDF1F",
  Dot: "\uD83D\uDD35",
};

const windSymbols: Record<string, string> = {
  North: "\u2B06\uFE0F",
  South: "\u2B07\uFE0F",
  East: "\u27A1\uFE0F",
  West: "\u2B05\uFE0F",
};

const dragonDisplay: Record<string, { symbol: string; color: string }> = {
  Red: { symbol: "\uD83D\uDD34", color: "text-red-600" },
  Green: { symbol: "\uD83D\uDFE2", color: "text-green-600" },
  White: { symbol: "\uD83C\uDFAF", color: "text-slate-600" },
};

export function Tile({ tile, onClick, isInteractive = false, isRecent = false, size = "md" }: TileProps) {
  const sizeClasses = {
    sm: "w-12 h-16 text-[10px]",
    md: "w-14 h-[72px] text-xs",
    lg: "w-16 h-20 text-sm",
  };

  let topContent: string | null = null;
  let mainContent: string = "";
  let bottomLabel: string = "";
  let extraClass = "";

  if (tile.suit === "Joker") {
    mainContent = "\uD83C\uDCCF";
    bottomLabel = "Joker";
  } else if (tile.suit === "Flower") {
    mainContent = "\uD83C\uDF38";
    bottomLabel = "Flower";
  } else if (tile.suit === "Wind") {
    const windName = String(tile.value);
    mainContent = windSymbols[windName] || windName;
    bottomLabel = windName;
  } else if (tile.suit === "Dragon") {
    const dragonName = String(tile.value);
    const info = dragonDisplay[dragonName];
    if (info) {
      mainContent = info.symbol;
      extraClass = info.color;
    } else {
      mainContent = dragonName;
    }
    bottomLabel = dragonName;
  } else {
    const num = tile.value as number;
    topContent = suitSymbols[tile.suit] || "";
    mainContent = numberEmojis[num] || String(num);
    bottomLabel = `${tile.suit} ${num}`;
  }

  return (
    <motion.button
      data-testid={`tile-${tile.id}`}
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isInteractive ? { y: -6, scale: 1.08 } : {}}
      whileTap={isInteractive ? { scale: 0.95 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-md border-2 shadow-sm select-none font-bold leading-tight text-center gap-0.5",
        sizeClasses[size],
        suitColors[tile.suit] || "text-slate-700 border-slate-200 bg-white",
        isInteractive && "cursor-pointer hover:shadow-md hover:border-current",
        !isInteractive && "cursor-default",
        isRecent && "ring-2 ring-orange-400 ring-offset-1 ring-offset-background",
        extraClass
      )}
    >
      {topContent && <span className="text-sm leading-none">{topContent}</span>}
      <span className="text-lg leading-none">{mainContent}</span>
      <span className="text-[9px] leading-none opacity-70 font-medium">{bottomLabel}</span>
    </motion.button>
  );
}

export function TileBack({ count }: { count: number }) {
  return (
    <div className="relative w-12 h-16 bg-primary/20 rounded-md flex items-center justify-center border-2 border-primary/30" data-testid="tile-back-wall">
      <span className="font-mono font-bold text-primary text-lg">{count}</span>
    </div>
  );
}
