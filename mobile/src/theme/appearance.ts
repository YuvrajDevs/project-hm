// Dark (default) or light. Only the page, and text sitting straight on it, change; every card keeps its own colours
// (DESIGN_SYSTEM.md "Light mode"). Saved on the device and read once at launch.
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PAGE } from "./tokens";

export type Appearance = "dark" | "light";
const KEY = "hm_theme_app";

interface AppearanceState {
  mode: Appearance;
  setMode: (mode: Appearance) => void;
}

export const useAppearance = create<AppearanceState>((set) => ({
  mode: "dark",
  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(KEY, mode).catch(() => {});
  },
}));

export const loadAppearance = async () => {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") useAppearance.setState({ mode: saved });
  } catch { /* first launch, or storage unavailable: stay dark */ }
};

export interface PageColors {
  page: string;
  /** Text and icons sitting directly on the page */
  ink: string;
  inkSoft: string;
  inkMuted: string;
  hairline: string;
  fill: string;
  isLight: boolean;
}

const DARK: PageColors = {
  page: PAGE.dark, ink: "#ffffff", inkSoft: "#d4d4d4", inkMuted: "#8a8a8a",
  hairline: "rgba(255,255,255,0.1)", fill: "rgba(255,255,255,0.05)", isLight: false,
};
const LIGHT: PageColors = {
  page: PAGE.light, ink: "#141210", inkSoft: "#3d3a35", inkMuted: "#6b665e",
  hairline: "rgba(20,18,16,0.12)", fill: "rgba(20,18,16,0.05)", isLight: true,
};

/** Colours for things that sit on the page. Re-renders only when the appearance itself changes. */
export const usePageColors = (): PageColors => (useAppearance((s) => s.mode) === "light" ? LIGHT : DARK);
export const pageColorsFor = (mode: Appearance) => (mode === "light" ? LIGHT : DARK);
