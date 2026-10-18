"use client";

import { useEffect } from "react";

// Light is the default, and only an explicit "dark" choice (saved on this device) turns it off. The theme lives as an
// attribute on <html>; if anything ever rebuilds the page and drops it (it is not part of the server HTML), this puts it back.
export const ThemeGuard = () => {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      try {
        if (localStorage.getItem("hm_theme") !== "dark" && root.getAttribute("data-theme") !== "light") {
          root.setAttribute("data-theme", "light");
        }
      } catch {
        if (root.getAttribute("data-theme") !== "light") root.setAttribute("data-theme", "light");
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return null;
};
