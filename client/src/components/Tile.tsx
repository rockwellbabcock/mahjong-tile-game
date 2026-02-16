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

export function Tile({ tile, onClick, isInteractive = false, isRecent = false, size = "md" }: TileProps) {
  let displayLabel = "";

  if (tile.suit === "Joker") {
    displayLabel = "Joker";
  } else if (tile.suit === "Flower") {
    displayLabel = "Flower";
  } else if (tile.suit === "Wind") {
    displayLabel = String(tile.value);
  } else if (tile.suit === "Dragon") {
    displayLabel = String(tile.value);
  } else {
    displayLabel = `${tile.suit} ${tile.value}`;
  }

  const sizeClasses = {
    sm: "w-12 h-16 text-[10px]",
    md: "w-14 h-[72px] text-xs",
    lg: "w-16 h-20 text-sm",
  };

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
        "relative flex flex-col items-center justify-center rounded-md border-2 shadow-sm select-none font-bold leading-tight text-center",
        sizeClasses[size],
        suitColors[tile.suit] || "text-slate-700 border-slate-200 bg-white",
        isInteractive && "cursor-pointer hover:shadow-md hover:border-current",
        !isInteractive && "cursor-default",
        isRecent && "ring-2 ring-orange-400 ring-offset-1 ring-offset-background"
      )}
    >
      <span className="leading-tight">{displayLabel}</span>
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
