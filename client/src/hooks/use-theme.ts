import { createContext, useContext, useState, useCallback } from "react";

export type AppTheme = "classic" | "jade";

interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "classic",
  toggleTheme: () => {},
});

export function useThemeState(): ThemeContextValue {
  const saved = typeof window !== "undefined" ? localStorage.getItem("mahjong-theme") : null;
  const initial: AppTheme = saved === "jade" ? "jade" : "classic";
  const [theme, setTheme] = useState<AppTheme>(initial);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "classic" ? "jade" : "classic";
      localStorage.setItem("mahjong-theme", next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
