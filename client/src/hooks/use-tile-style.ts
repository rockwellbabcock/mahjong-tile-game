import { createContext, useContext, useState, useCallback } from "react";

export type TileStyle = "classic" | "emoji" | "text";

const STYLE_ORDER: TileStyle[] = ["classic", "emoji", "text"];

interface TileStyleContextValue {
  tileStyle: TileStyle;
  cycleTileStyle: () => void;
}

export const TileStyleContext = createContext<TileStyleContextValue>({
  tileStyle: "classic",
  cycleTileStyle: () => {},
});

export function useTileStyleState(): TileStyleContextValue {
  const saved = typeof window !== "undefined" ? localStorage.getItem("tile-style") : null;
  const initial = STYLE_ORDER.includes(saved as TileStyle) ? (saved as TileStyle) : "classic";
  const [tileStyle, setTileStyle] = useState<TileStyle>(initial);

  const cycleTileStyle = useCallback(() => {
    setTileStyle(prev => {
      const idx = STYLE_ORDER.indexOf(prev);
      const next = STYLE_ORDER[(idx + 1) % STYLE_ORDER.length];
      localStorage.setItem("tile-style", next);
      return next;
    });
  }, []);

  return { tileStyle, cycleTileStyle };
}

export function useTileStyle() {
  return useContext(TileStyleContext);
}
