import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { type TileStyle } from "./use-tile-style";

export type MatTheme = "classic" | "modern" | "minimal";

export const MAT_TILE_PAIRS: Record<TileStyle, MatTheme> = {
  classic: "classic",
  emoji: "modern",
  text: "minimal",
};

export const MAT_LABELS: Record<MatTheme, string> = {
  classic: "Classic Mat",
  modern: "Modern Mat",
  minimal: "Minimal Mat",
};

const MAT_ORDER: MatTheme[] = ["classic", "modern", "minimal"];

interface MatThemeContextValue {
  matTheme: MatTheme;
  setMatTheme: (theme: MatTheme) => void;
  cycleMatTheme: () => void;
  syncWithTileStyle: (tileStyle: TileStyle) => void;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
}

export const MatThemeContext = createContext<MatThemeContextValue>({
  matTheme: "classic",
  setMatTheme: () => {},
  cycleMatTheme: () => {},
  syncWithTileStyle: () => {},
  autoSync: true,
  setAutoSync: () => {},
});

export function useMatThemeState(): MatThemeContextValue {
  const savedMat = typeof window !== "undefined" ? localStorage.getItem("mat-theme") : null;
  const savedAutoSync = typeof window !== "undefined" ? localStorage.getItem("mat-auto-sync") : null;

  const migrated = savedMat === "teal" ? "classic" : savedMat === "blue" ? "modern" : savedMat === "burgundy" ? "minimal" : savedMat;
  const initial = MAT_ORDER.includes(migrated as MatTheme) ? (migrated as MatTheme) : "classic";
  const [matTheme, setMatThemeState] = useState<MatTheme>(initial);
  const [autoSync, setAutoSyncState] = useState(savedAutoSync !== "false");

  const setMatTheme = useCallback((theme: MatTheme) => {
    setMatThemeState(theme);
    localStorage.setItem("mat-theme", theme);
  }, []);

  const cycleMatTheme = useCallback(() => {
    setMatThemeState(prev => {
      const idx = MAT_ORDER.indexOf(prev);
      const next = MAT_ORDER[(idx + 1) % MAT_ORDER.length];
      localStorage.setItem("mat-theme", next);
      return next;
    });
  }, []);

  const syncWithTileStyle = useCallback((tileStyle: TileStyle) => {
    const paired = MAT_TILE_PAIRS[tileStyle];
    setMatThemeState(paired);
    localStorage.setItem("mat-theme", paired);
  }, []);

  const setAutoSync = useCallback((val: boolean) => {
    setAutoSyncState(val);
    localStorage.setItem("mat-auto-sync", String(val));
  }, []);

  return { matTheme, setMatTheme, cycleMatTheme, syncWithTileStyle, autoSync, setAutoSync };
}

export function useMatTheme(): MatThemeContextValue {
  return useContext(MatThemeContext);
}

export interface MatColors {
  tableFrom: string;
  tableVia: string;
  tableTo: string;
  borderWidth: string;
  borderColor: string;
  dotColor: string;
  dotOpacity: string;
  activeGlow: string;
  headerBg: string;
  headerBorder: string;
  cornerColor: string;
  innerBorderColor: string;
  surfaceTexture: "dots" | "linen" | "none";
  surfaceOverlay: string;
  centerMotif: "tong" | "compass" | "none";
  centerMotifColor: string;
  borderMotif: "bamboo" | "geometric" | "none";
  borderMotifColor: string;
  cornerStyle: "dragon-scroll" | "floral" | "geometric" | "none";
}

export const MAT_COLORS: Record<MatTheme, MatColors> = {
  classic: {
    tableFrom: "from-emerald-950",
    tableVia: "via-emerald-900",
    tableTo: "to-emerald-800",
    borderWidth: "border-[6px] sm:border-[10px]",
    borderColor: "border-amber-900/80",
    dotColor: "rgba(0,60,30,0.25)",
    dotOpacity: "opacity-20",
    activeGlow: "bg-emerald-500/20 border border-emerald-400/40",
    headerBg: "bg-emerald-950/95",
    headerBorder: "border-emerald-800/60",
    cornerColor: "rgba(212,175,55,0.35)",
    innerBorderColor: "rgba(212,175,55,0.2)",
    surfaceTexture: "dots",
    surfaceOverlay: "from-black/15 via-transparent to-black/10",
    centerMotif: "tong",
    centerMotifColor: "rgba(212,175,55,0.18)",
    borderMotif: "bamboo",
    borderMotifColor: "rgba(212,175,55,0.12)",
    cornerStyle: "dragon-scroll",
  },
  modern: {
    tableFrom: "from-slate-950",
    tableVia: "via-slate-900",
    tableTo: "to-indigo-950",
    borderWidth: "border-2 sm:border-4",
    borderColor: "border-slate-600/50",
    dotColor: "rgba(100,116,139,0.12)",
    dotOpacity: "opacity-10",
    activeGlow: "bg-indigo-500/20 border border-indigo-400/40",
    headerBg: "bg-slate-950/95",
    headerBorder: "border-slate-700/50",
    cornerColor: "rgba(99,102,241,0.15)",
    innerBorderColor: "rgba(99,102,241,0.15)",
    surfaceTexture: "linen",
    surfaceOverlay: "from-black/10 via-transparent to-indigo-950/20",
    centerMotif: "compass",
    centerMotifColor: "rgba(148,163,184,0.1)",
    borderMotif: "none",
    borderMotifColor: "transparent",
    cornerStyle: "floral",
  },
  minimal: {
    tableFrom: "from-stone-700",
    tableVia: "via-stone-600",
    tableTo: "to-stone-500",
    borderWidth: "border sm:border-2",
    borderColor: "border-stone-400/40",
    dotColor: "transparent",
    dotOpacity: "opacity-0",
    activeGlow: "bg-stone-300/20 border border-stone-300/30",
    headerBg: "bg-stone-700/95",
    headerBorder: "border-stone-500/40",
    cornerColor: "rgba(168,162,158,0.15)",
    innerBorderColor: "transparent",
    surfaceTexture: "none",
    surfaceOverlay: "from-black/5 via-transparent to-stone-400/5",
    centerMotif: "none",
    centerMotifColor: "transparent",
    borderMotif: "geometric",
    borderMotifColor: "rgba(168,162,158,0.08)",
    cornerStyle: "geometric",
  },
};
