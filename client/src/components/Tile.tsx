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

const SEASON_NAMES = ["Spring", "Summer", "Fall", "Winter"];

function isFlower(tile: TileType): boolean {
  return tile.suit === "Flower" && !SEASON_NAMES.includes(String(tile.value));
}

function isSeason(tile: TileType): boolean {
  return tile.suit === "Flower" && SEASON_NAMES.includes(String(tile.value));
}

const dragonSuitMap: Record<string, string> = {
  Red: "Crak",
  Green: "Bam",
  White: "Dot",
};

const suitColors: Record<string, string> = {
  Bam: "text-emerald-700 border-emerald-300 bg-emerald-50",
  Crak: "text-red-700 border-red-300 bg-red-50",
  Dot: "text-blue-700 border-blue-300 bg-blue-50",
  Wind: "text-slate-800 border-slate-300 bg-slate-50",
  Dragon: "text-purple-800 border-purple-300 bg-purple-50",
  Flower: "text-fuchsia-700 border-fuchsia-300 bg-fuchsia-50",
  Season: "text-teal-700 border-teal-300 bg-teal-50",
  Joker: "text-amber-700 border-amber-300 bg-amber-50",
};

const classicSuitColors: Record<string, string> = {
  Bam: "text-emerald-700 border-emerald-200",
  Crak: "text-red-700 border-red-200",
  Dot: "text-blue-700 border-blue-200",
  Wind: "text-slate-800 border-slate-300",
  Dragon: "text-purple-800 border-purple-300",
  Flower: "text-fuchsia-700 border-fuchsia-200",
  Season: "text-teal-700 border-teal-200",
  Joker: "text-amber-700 border-amber-200 bg-amber-50",
};

const classicSuitIcons: Record<string, string> = {
  Bam: "\uD83C\uDF8B",
  Crak: "\u842C",
  Dot: "\u25C9",
  Wind: "\uD83D\uDCA8",
  Dragon: "\uD83D\uDC09",
  Flower: "\uD83C\uDF3A",
  Season: "\uD83C\uDF43",
  Joker: "\uD83C\uDCCF",
};

const flowerIcons: Record<string, string> = {
  Plum: "\uD83C\uDF38",
  Orchid: "\uD83C\uDF3C",
  Chrysanthemum: "\uD83C\uDF3B",
  Bamboo: "\uD83C\uDF8D",
};

const seasonIcons: Record<string, string> = {
  Spring: "\uD83C\uDF31",
  Summer: "\u2600\uFE0F",
  Fall: "\uD83C\uDF42",
  Winter: "\u2744\uFE0F",
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
  Red: { symbol: "\uD83D\uDC09", color: "text-red-600" },
  Green: { symbol: "\uD83D\uDC09", color: "text-green-600" },
  White: { symbol: "\uD83D\uDC09", color: "text-slate-500" },
};

function renderClassic(tile: TileType, size: "sm" | "md" | "lg") {
  let displayValue: string | number | null = tile.value;
  let icon = classicSuitIcons[tile.suit] || "";
  let colorKey: string = tile.suit;

  if (tile.suit === "Dragon") {
    if (tile.value === "Red") { displayValue = "\u4E2D"; icon = "\uD83C\uDC04"; }
    if (tile.value === "Green") { displayValue = "\u767C"; icon = "\uD83D\uDC09"; }
    if (tile.value === "White") { displayValue = "\u25A1"; icon = "\uD83E\uDDFC"; }
    colorKey = "Dragon";
  }

  if (tile.suit === "Wind") {
    displayValue = String(tile.value).charAt(0);
  }

  if (tile.suit === "Flower") {
    const name = String(tile.value);
    if (isSeason(tile)) {
      icon = seasonIcons[name] || "\uD83C\uDF43";
      colorKey = "Season";
    } else {
      icon = flowerIcons[name] || "\uD83C\uDF3A";
      colorKey = "Flower";
    }
    displayValue = name;
  }

  const sizeClasses = {
    sm: "w-12 h-16 text-[10px]",
    md: "w-14 h-[72px] text-xs",
    lg: "w-16 h-20 text-sm",
  };

  let labelContent: string | null = null;
  let sublabel: string | null = null;
  if (tile.suit === "Flower") {
    labelContent = String(tile.value);
  } else if (tile.suit === "Dragon") {
    const assoc = dragonSuitMap[String(tile.value)];
    labelContent = `${tile.value} Drgn`;
    sublabel = assoc ? `(${assoc})` : null;
  } else if (tile.suit === "Wind") {
    labelContent = String(displayValue);
  } else if (tile.suit !== "Joker") {
    labelContent = String(displayValue);
  }

  let cornerValue = typeof tile.value === "number" ? String(tile.value) : null;
  if (tile.suit === "Dragon") {
    const assoc = dragonSuitMap[String(tile.value)];
    cornerValue = assoc ? assoc.charAt(0) : null;
  }
  if (tile.suit === "Flower") {
    cornerValue = isSeason(tile) ? "S" : "F";
  }

  return {
    sizeClass: sizeClasses[size],
    colorClass: classicSuitColors[colorKey] || "text-slate-700 border-slate-200",
    content: (
      <>
        {cornerValue && (
          <span className="absolute top-0.5 left-1 text-[0.6rem] font-bold opacity-60 font-mono">
            {cornerValue}
          </span>
        )}
        <div className="flex flex-col items-center gap-0">
          <span className="text-xl sm:text-2xl leading-none filter drop-shadow-sm">
            {icon}
          </span>
          {labelContent && (
            <span className="font-bold text-[0.55rem] sm:text-xs leading-none truncate max-w-full px-0.5">
              {labelContent}
            </span>
          )}
          {sublabel && (
            <span className="text-[0.45rem] sm:text-[0.55rem] leading-none opacity-60 font-medium">
              {sublabel}
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
  let colorKey: string = tile.suit;

  if (tile.suit === "Joker") {
    mainContent = "\uD83C\uDCCF";
    bottomLabel = "Joker";
  } else if (tile.suit === "Flower") {
    const name = String(tile.value);
    if (isSeason(tile)) {
      mainContent = seasonIcons[name] || "\uD83C\uDF43";
      bottomLabel = name;
      colorKey = "Season";
    } else {
      mainContent = flowerIcons[name] || "\uD83C\uDF38";
      bottomLabel = name;
      colorKey = "Flower";
    }
  } else if (tile.suit === "Wind") {
    const name = String(tile.value);
    mainContent = windSymbols[name] || name;
    bottomLabel = name;
  } else if (tile.suit === "Dragon") {
    const name = String(tile.value);
    const info = dragonDisplay[name];
    const assoc = dragonSuitMap[name];
    mainContent = info?.symbol || name;
    extraClass = info?.color || "";
    bottomLabel = assoc ? `${name} Drgn (${assoc})` : `${name} Drgn`;
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
    colorClass: cn(suitColors[colorKey] || "text-slate-700 border-slate-200 bg-white", extraClass),
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
  let colorKey: string = tile.suit;

  if (tile.suit === "Joker") label = "Joker";
  else if (tile.suit === "Flower") {
    const name = String(tile.value);
    if (isSeason(tile)) {
      label = name;
      colorKey = "Season";
    } else {
      label = name;
      colorKey = "Flower";
    }
  }
  else if (tile.suit === "Wind") label = String(tile.value);
  else if (tile.suit === "Dragon") {
    const name = String(tile.value);
    const assoc = dragonSuitMap[name];
    label = assoc ? `${name} Dragon (${assoc})` : `${name} Dragon`;
  }
  else label = `${tile.suit} ${tile.value}`;

  const sizeClasses = {
    sm: "w-12 h-16 text-[10px]",
    md: "w-14 h-[72px] text-xs",
    lg: "w-16 h-20 text-sm",
  };

  return {
    sizeClass: sizeClasses[size],
    colorClass: suitColors[colorKey] || "text-slate-700 border-slate-200 bg-white",
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
