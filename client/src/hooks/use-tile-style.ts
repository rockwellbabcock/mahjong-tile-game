import { createContext, useContext, useState, useCallback } from "react";

export type TileStyle = "emoji" | "text";

interface TileStyleContextValue {
  tileStyle: TileStyle;
  toggleTileStyle: () => void;
}

export const TileStyleContext = createContext<TileStyleContextValue>({
  tileStyle: "emoji",
  toggleTileStyle: () => {},
});

export function useTileStyleState(): TileStyleContextValue {
  const saved = typeof window !== "undefined" ? localStorage.getItem("tile-style") : null;
  const [tileStyle, setTileStyle] = useState<TileStyle>((saved as TileStyle) || "emoji");

  const toggleTileStyle = useCallback(() => {
    setTileStyle(prev => {
      const next = prev === "emoji" ? "text" : "emoji";
      localStorage.setItem("tile-style", next);
      return next;
    });
  }, []);

  return { tileStyle, toggleTileStyle };
}

export function useTileStyle() {
  return useContext(TileStyleContext);
}
