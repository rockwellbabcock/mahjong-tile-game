import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { type TileStyle } from "./use-tile-style";

export type MatTheme = "teal" | "blue" | "burgundy";

export const MAT_TILE_PAIRS: Record<TileStyle, MatTheme> = {
  classic: "teal",
  emoji: "blue",
  text: "burgundy",
};

export const MAT_LABELS: Record<MatTheme, string> = {
  teal: "Jade Table",
  blue: "Sapphire Table",
  burgundy: "Rosewood Table",
};

const MAT_ORDER: MatTheme[] = ["teal", "blue", "burgundy"];

interface MatThemeContextValue {
  matTheme: MatTheme;
  setMatTheme: (theme: MatTheme) => void;
  cycleMatTheme: () => void;
  syncWithTileStyle: (tileStyle: TileStyle) => void;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
}

export const MatThemeContext = createContext<MatThemeContextValue>({
  matTheme: "teal",
  setMatTheme: () => {},
  cycleMatTheme: () => {},
  syncWithTileStyle: () => {},
  autoSync: true,
  setAutoSync: () => {},
});

export function useMatThemeState(): MatThemeContextValue {
  const savedMat = typeof window !== "undefined" ? localStorage.getItem("mat-theme") : null;
  const savedAutoSync = typeof window !== "undefined" ? localStorage.getItem("mat-auto-sync") : null;

  const initial = MAT_ORDER.includes(savedMat as MatTheme) ? (savedMat as MatTheme) : "teal";
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
  tableBg: string;
  tableFrom: string;
  tableVia: string;
  tableTo: string;
  borderColor: string;
  dotColor: string;
  activeGlow: string;
  headerBg: string;
  headerBorder: string;
}

export const MAT_COLORS: Record<MatTheme, MatColors> = {
  teal: {
    tableBg: "bg-teal-800",
    tableFrom: "from-teal-900",
    tableVia: "via-teal-800",
    tableTo: "to-teal-700",
    borderColor: "border-stone-600",
    dotColor: "rgba(0,80,80,0.15)",
    activeGlow: "bg-teal-500/20 border border-teal-400/40",
    headerBg: "bg-stone-900/90",
    headerBorder: "border-stone-700",
  },
  blue: {
    tableBg: "bg-blue-900",
    tableFrom: "from-blue-950",
    tableVia: "via-blue-900",
    tableTo: "to-blue-800",
    borderColor: "border-amber-800/60",
    dotColor: "rgba(30,30,80,0.15)",
    activeGlow: "bg-blue-500/20 border border-blue-400/40",
    headerBg: "bg-slate-900/90",
    headerBorder: "border-slate-700",
  },
  burgundy: {
    tableBg: "bg-rose-950",
    tableFrom: "from-rose-950",
    tableVia: "via-rose-900",
    tableTo: "to-rose-800",
    borderColor: "border-amber-900/50",
    dotColor: "rgba(80,20,20,0.15)",
    activeGlow: "bg-rose-500/20 border border-rose-400/40",
    headerBg: "bg-stone-900/90",
    headerBorder: "border-stone-700",
  },
};
