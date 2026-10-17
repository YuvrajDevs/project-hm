"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

export const THEME_KEY = "hm_theme";

const subscribe = (notify: () => void) => {
  window.addEventListener("hm-theme", notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener("hm-theme", notify);
    window.removeEventListener("storage", notify);
  };
};

// The theme lives on the <html> element (set by a tiny script before the page paints), so there is no flash
const read = (): Theme => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);

  const setTheme = useCallback((next: Theme) => {
    if (next === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage can be blocked; the choice still applies until reload */ }
    window.dispatchEvent(new Event("hm-theme"));
  }, []);

  return { theme, setTheme };
};
