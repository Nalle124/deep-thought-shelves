import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "paper" | "dark";
// Cycle order when tapping the theme button: light → paper → dark → light.
const ORDER: Theme[] = ["light", "paper", "dark"];

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    const valid = stored && ORDER.includes(stored) ? stored : null;
    const initial: Theme = valid ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("paper", theme === "paper");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeCtx.Provider
      value={{ theme, toggle: () => setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]) }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
