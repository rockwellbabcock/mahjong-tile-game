import { motion } from "framer-motion";
import { type Tile as TileType } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useTileStyle } from "@/hooks/use-tile-style";

interface TileProps {
  tile: TileType;
  onClick?: () => void;
  isInteractive?: boolean;
  isRecent?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  dimmed?: boolean;
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
  Joker: "text-amber-700 border-amber-300 bg-amber-50",
  Blank: "text-gray-400 border-gray-300 bg-gray-50",
};

const classicSuitColors: Record<string, string> = {
  Bam: "text-emerald-700 border-emerald-200",
  Crak: "text-red-700 border-red-200",
  Dot: "text-blue-700 border-blue-200",
  Wind: "text-slate-800 border-slate-300",
  Dragon: "text-purple-800 border-purple-300",
  Flower: "text-fuchsia-700 border-fuchsia-200",
  Joker: "text-amber-700 border-amber-200 bg-amber-50",
  Blank: "text-gray-400 border-gray-200",
};

const classicSuitIcons: Record<string, string> = {
  Bam: "\uD83C\uDF8B",
  Crak: "\u842C",
  Dot: "\u25C9",
  Wind: "\uD83D\uDCA8",
  Dragon: "\uD83D\uDC09",
  Flower: "\uD83C\uDF3A",
  Joker: "\uD83C\uDCCF",
  Blank: " ",
};

const flowerIcons: Record<string, string> = {
  Plum: "\uD83C\uDF38",
  Orchid: "\uD83C\uDF3C",
  Chrysanthemum: "\uD83C\uDF3B",
  Bamboo: "\uD83C\uDF8D",
  Lily: "\uD83C\uDF37",
  Lotus: "\uD83E\uDEB7",
  Peony: "\uD83C\uDF39",
  Jasmine: "\uD83E\uDEBB",
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

function renderClassic(tile: TileType, size: "xs" | "sm" | "md" | "lg") {
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
    icon = flowerIcons[name] || "\uD83C\uDF3A";
    colorKey = "Flower";
    displayValue = name;
  }

  if (tile.suit === "Blank") {
    displayValue = null;
    icon = " ";
    colorKey = "Blank";
  }

  const sizeClasses = {
    xs: "w-9 h-12 text-[8px]",
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
    cornerValue = "F";
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

function renderEmoji(tile: TileType, size: "xs" | "sm" | "md" | "lg") {
  let topContent: string | null = null;
  let mainContent = "";
  let bottomLabel = "";
  let extraClass = "";
  let colorKey: string = tile.suit;

  if (tile.suit === "Blank") {
    mainContent = " ";
    bottomLabel = "Blank";
  } else if (tile.suit === "Joker") {
    mainContent = "\uD83C\uDCCF";
    bottomLabel = "Joker";
  } else if (tile.suit === "Flower") {
    const name = String(tile.value);
    mainContent = flowerIcons[name] || "\uD83C\uDF38";
    bottomLabel = name;
    colorKey = "Flower";
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
    xs: "w-9 h-12 text-[8px]",
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

function renderText(tile: TileType, size: "xs" | "sm" | "md" | "lg") {
  let label = "";
  let colorKey: string = tile.suit;

  if (tile.suit === "Blank") label = "Blank";
  else if (tile.suit === "Joker") label = "Joker";
  else if (tile.suit === "Flower") {
    label = String(tile.value);
    colorKey = "Flower";
  }
  else if (tile.suit === "Wind") label = String(tile.value);
  else if (tile.suit === "Dragon") {
    const name = String(tile.value);
    const assoc = dragonSuitMap[name];
    label = assoc ? `${name} Dragon (${assoc})` : `${name} Dragon`;
  }
  else label = `${tile.suit} ${tile.value}`;

  const sizeClasses = {
    xs: "w-9 h-12 text-[8px]",
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

export function Tile({ tile, onClick, isInteractive = false, isRecent = false, size = "md", dimmed = false }: TileProps) {
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
        isRecent && "ring-2 ring-orange-400 ring-offset-1 ring-offset-background",
        dimmed && "opacity-40"
      )}
    >
      {rendered.content}
    </motion.button>
  );
}

export function TileBack({ count }: { count: number }) {
  return (
    <div className="relative w-10 h-14 sm:w-12 sm:h-16 bg-primary/20 rounded-md flex items-center justify-center border-2 border-primary/30" data-testid="tile-back-wall">
      <span className="font-mono font-bold text-primary text-base sm:text-lg">{count}</span>
    </div>
  );
}
