import type { ChatWallpaper, WallpaperSettings } from "@/lib/firestore-helpers";

export const LEVELS = ["Off", "Low", "Medium", "High", "Max"] as const;
const DIM = [0, 0.2, 0.4, 0.6, 0.8];
const BLUR = [0, 2, 5, 9, 14];

export interface EffectiveWallpaper { src: string; dim: number; blur: number }

/**
 * What this person's chat shows: their own picture, or the one their partner set if they chose to use it.
 * Dim and blur are always this person's own levels.
 */
export const effectiveWallpaper = (mine: ChatWallpaper, theirs: ChatWallpaper): EffectiveWallpaper | null => {
  const s = mine.settings;
  if (!s) return null;
  const picked = s.source === "own" ? mine : s.source === "partner" && theirs.settings?.source === "own" ? theirs : null;
  if (!picked?.image) return null;
  return { src: `data:${picked.mime || "image/jpeg"};base64,${picked.image}`, dim: DIM[s.dim] ?? 0, blur: BLUR[s.blur] ?? 0 };
};

// The partner has a picture of their own that this person hasn't answered yet
export const pendingOffer = (mine: ChatWallpaper, theirs: ChatWallpaper): WallpaperSettings | null => {
  const t = theirs.settings;
  if (!t || t.source !== "own" || !theirs.image) return null;
  const m = mine.settings;
  if (m && (m.source === "partner" || m.source === "own")) return null;
  if (m?.dismissedOffer === t.updatedAt) return null;
  return t;
};
