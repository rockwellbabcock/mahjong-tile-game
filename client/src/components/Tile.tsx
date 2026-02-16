import { motion } from "framer-motion";
import { type Tile as TileType } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useTileStyle } from "@/hooks/use-tile-style";

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

const classicSuitColors: Record<string, string> = {
  Bam: "text-emerald-700 border-emerald-200",
  Crak: "text-red-700 border-red-200",
  Dot: "text-blue-700 border-blue-200",
  Wind: "text-slate-800 border-slate-300",
  Dragon: "text-slate-900 border-slate-300",
  Flower: "text-fuchsia-700 border-fuchsia-200",
  Joker: "text-amber-700 border-amber-200 bg-amber-50",
};

const classicSuitIcons: Record<string, string> = {
  Bam: "\uD83C\uDF8B",
  Crak: "\u842C",
  Dot: "\u25C9",
  Wind: "\uD83D\uDCA8",
  Dragon: "\uD83D\uDC09",
  Flower: "\uD83C\uDF3A",
  Joker: "\uD83C\uDCCF",
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

function renderClassic(tile: TileType, size: "sm" | "md" | "lg") {
  let displayValue: string | number | null = tile.value;
  let icon = classicSuitIcons[tile.suit] || "";

  if (tile.suit === "Dragon") {
    if (tile.value === "Red") { displayValue = "\u4E2D"; icon = "\uD83D\uDD34"; }
    if (tile.value === "Green") { displayValue = "\u767C"; icon = "\uD83D\uDFE2"; }
    if (tile.value === "White") { displayValue = "\u25A1"; icon = "\uD83C\uDFAF"; }
  }

  if (tile.suit === "Wind") {
    displayValue = String(tile.value).charAt(0);
  }

  const sizeClasses = {
    sm: "w-8 h-12 text-xs",
    md: "w-10 h-14 sm:w-12 sm:h-16 text-sm",
    lg: "w-14 h-20 text-base",
  };

  return {
    sizeClass: sizeClasses[size],
    colorClass: classicSuitColors[tile.suit] || "text-slate-700 border-slate-200",
    content: (
      <>
        <span className="absolute top-0.5 left-1 text-[0.6rem] font-bold opacity-60 font-mono">
          {typeof tile.value === "number" ? tile.value : displayValue}
        </span>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-xl sm:text-2xl leading-none filter drop-shadow-sm">
            {icon}
          </span>
          {tile.suit !== "Joker" && tile.suit !== "Flower" && (
            <span className="font-bold text-xs sm:text-sm leading-none">
              {displayValue}
            </span>
          )}
        </div>
      </>
    ),
  };
}

function renderEmoji(tile: TileType, size: "sm" | "md" | "lg") {
  let topContent: string | null = null;
  let mainContent = "";
  let bottomLabel = "";
  let extraClass = "";

  if (tile.suit === "Joker") {
    mainContent = "\uD83C\uDCCF";
    bottomLabel = "Joker";
  } else if (tile.suit === "Flower") {
    mainContent = "\uD83C\uDF38";
    bottomLabel = "Flower";
  } else if (tile.suit === "Wind") {
    const name = String(tile.value);
    mainContent = windSymbols[name] || name;
    bottomLabel = name;
  } else if (tile.suit === "Dragon") {
    const name = String(tile.value);
    const info = dragonDisplay[name];
    mainContent = info?.symbol || name;
    extraClass = info?.color || "";
    bottomLabel = name;
  } else {
    const num = tile.value as number;
    topContent = suitSymbols[tile.suit] || "";
    mainContent = numberEmojis[num] || String(num);
    bottomLabel = `${tile.suit} ${num}`;
  }

  const sizeClasses = {
    sm: "w-12 h-16 text-[10px]",
    md: "w-14 h-[72px] text-xs",
    lg: "w-16 h-20 text-sm",
  };

  return {
    sizeClass: sizeClasses[size],
    colorClass: cn(suitColors[tile.suit] || "text-slate-700 border-slate-200 bg-white", extraClass),
    content: (
      <>
        {topContent && <span className="text-sm leading-none">{topContent}</span>}
        <span className="text-lg leading-none">{mainContent}</span>
        <span className="text-[9px] leading-none opacity-70 font-medium">{bottomLabel}</span>
      </>
    ),
  };
}

function renderText(tile: TileType, size: "sm" | "md" | "lg") {
  let label = "";
  if (tile.suit === "Joker") label = "Joker";
  else if (tile.suit === "Flower") label = "Flower";
  else if (tile.suit === "Wind") label = String(tile.value);
  else if (tile.suit === "Dragon") label = String(tile.value);
  else label = `${tile.suit} ${tile.value}`;

  const sizeClasses = {
    sm: "w-12 h-16 text-[10px]",
    md: "w-14 h-[72px] text-xs",
    lg: "w-16 h-20 text-sm",
  };

  return {
    sizeClass: sizeClasses[size],
    colorClass: suitColors[tile.suit] || "text-slate-700 border-slate-200 bg-white",
    content: <span className="leading-tight px-0.5">{label}</span>,
  };
}

export function Tile({ tile, onClick, isInteractive = false, isRecent = false, size = "md" }: TileProps) {
  const { tileStyle } = useTileStyle();

  const rendered =
    tileStyle === "classic" ? renderClassic(tile, size)
    : tileStyle === "emoji" ? renderEmoji(tile, size)
    : renderText(tile, size);

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
        "relative flex flex-col items-center justify-center rounded-md border-2 shadow-sm select-none font-bold leading-tight text-center gap-0.5 tile-face",
        rendered.sizeClass,
        rendered.colorClass,
        isInteractive && "cursor-pointer hover:shadow-md hover:border-current",
        !isInteractive && "cursor-default",
        isRecent && "ring-2 ring-orange-400 ring-offset-1 ring-offset-background"
      )}
    >
      {rendered.content}
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
