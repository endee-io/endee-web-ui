'use client'

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme(): [
  Theme,
  React.Dispatch<React.SetStateAction<Theme>>
] {
  // Default to "light" on the server; hydrate the persisted theme on the
  // client after mount (localStorage is unavailable during SSR/prerender).
  const [theme, setTheme] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) setTheme(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme, hydrated]);

  return [theme, setTheme];
}
