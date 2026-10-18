"use client";

import { useEffect } from "react";
import { wantsLight } from "@/lib/theme";

// Keeps the theme on <html> matching the rule in lib/theme.ts: when someone signs in or out, and if anything ever
// rebuilds the page and drops the attribute (it is not part of the server HTML).
export const ThemeGuard = () => {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const light = wantsLight();
      const isLight = root.getAttribute("data-theme") === "light";
      if (light && !isLight) root.setAttribute("data-theme", "light");
      else if (!light && isLight) root.removeAttribute("data-theme");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("hm-auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("hm-auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return null;
};
