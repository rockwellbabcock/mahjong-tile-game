import { motion } from "framer-motion";
import { type Tile as TileType } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TileProps {
  tile: TileType;
  onClick?: () => void;
  isInteractive?: boolean;
  isRecent?: boolean; // Highlight if recently drawn
  size?: "sm" | "md" | "lg";
}

const suitColors: Record<string, string> = {
  Bam: "text-emerald-700 border-emerald-200",
  Crak: "text-red-700 border-red-200",
  Dot: "text-blue-700 border-blue-200",
  Wind: "text-slate-800 border-slate-300",
  Dragon: "text-slate-900 border-slate-300",
  Flower: "text-fuchsia-700 border-fuchsia-200",
  Joker: "text-amber-700 border-amber-200 bg-amber-50",
};

const suitIcons: Record<string, string> = {
  Bam: "🎋",
  Crak: "萬",
  Dot: "◉",
  Wind: "💨",
  Dragon: "🐉",
  Flower: "🌺",
  Joker: "🃏",
};

export function Tile({ tile, onClick, isInteractive = false, isRecent = false, size = "md" }: TileProps) {
  // Determine display value
  let displayValue: string | number | null = tile.value;
  let icon = suitIcons[tile.suit] || "";
  
  // Specific overrides for Dragons/Winds to make them look nicer
  if (tile.suit === "Dragon") {
    if (tile.value === "Red") { displayValue = "中"; icon = "🔴"; }
    if (tile.value === "Green") { displayValue = "發"; icon = "🟢"; }
    if (tile.value === "White") { displayValue = "⬜"; icon = "⚪"; } // Soap
  }

  if (tile.suit === "Wind") {
    displayValue = String(tile.value).charAt(0); // N, E, S, W
  }

  const sizeClasses = {
    sm: "w-8 h-12 text-xs",
    md: "w-10 h-14 sm:w-12 sm:h-16 text-sm", // Responsive base size
    lg: "w-14 h-20 text-base",
  };

  return (
    <motion.button
      layoutId={tile.id}
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isInteractive ? { y: -8, scale: 1.05, zIndex: 10 } : {}}
      whileTap={isInteractive ? { scale: 0.95 } : {}}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 shadow-sm select-none",
        "tile-face transition-colors duration-200",
        sizeClasses[size],
        suitColors[tile.suit] || "text-slate-700 border-slate-200",
        isInteractive ? "cursor-pointer hover:shadow-lg hover:border-current" : "cursor-default",
        isRecent && "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
      )}
    >
      {/* Top Left Corner Value (Small) */}
      <span className="absolute top-0.5 left-1 text-[0.6rem] font-bold opacity-60 font-mono">
        {typeof tile.value === 'number' ? tile.value : displayValue}
      </span>

      {/* Center Content */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xl sm:text-2xl leading-none filter drop-shadow-sm">
          {icon}
        </span>
        {tile.suit !== "Joker" && tile.suit !== "Flower" && (
           <span className="font-display font-bold text-xs sm:text-sm leading-none">
             {displayValue}
           </span>
        )}
      </div>

      {/* Decorative backing or texture could go here */}
    </motion.button>
  );
}

export function TileBack({ count }: { count: number }) {
  // Renders a stack of tile backs
  return (
    <div className="relative w-12 h-16 bg-primary/20 rounded-lg flex items-center justify-center border-2 border-primary/30">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
      <span className="font-mono font-bold text-primary text-lg z-10">{count}</span>
    </div>
  );
}
