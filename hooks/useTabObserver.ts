"use client";

import { useEffect, useState } from "react";

export const useTabObserver = () => {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      setIsHidden(document.visibilityState === "hidden");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Initial set
    setIsHidden(document.visibilityState === "hidden");

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { isHidden };
};
