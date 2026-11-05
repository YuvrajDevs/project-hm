// Design tokens, taken from DESIGN_SYSTEM.md and app/theme.css so the app and the website look the same.
// Only the page and text sitting directly on it change between dark and light; cards keep their own colours.

export const FONT = {
  // Embedded at build time by the expo-font config plugin (app.json): no loading step on launch
  bebas: "BebasNeue_400Regular",
  body: "Outfit_400Regular",
  bodyMedium: "Outfit_500Medium",
  bodySemi: "Outfit_600SemiBold",
  bodyBold: "Outfit_700Bold",
} as const;

export const PAGE = { dark: "#0e0e0e", light: "#f4efe6" } as const;

export const C = {
  white: "#ffffff",
  black: "#000000",
  pink: "#ec4899",
  pink300: "#f9a8d4",
  pink400: "#f472b6",
  blue: "#60a5fa",
  blue300: "#93c5fd",
  blue400: "#60a5fa",
  yellow: "#facc15",
  orange: "#f97316",
  red: "#ef4444",
  rose300: "#fda4af",
  green: "#22c55e",
  emerald: "#10b981",
  amberDark: "#17140a",
  neutral300: "#d4d4d4",
  neutral400: "#a3a3a3",
  neutral500: "#737373",
  neutral600: "#525252",
  card: "#161616",
  cardBorder: "#232323",
  rowBorder: "#2a2a2a",
  chip: "#1c1c1c",
  chipHover: "#242424",
  overlay: "#141414",
} as const;

export const alpha = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export const W = (a: number) => `rgba(255, 255, 255, ${a})`;
export const B = (a: number) => `rgba(0, 0, 0, ${a})`;

/** Coloured card tones (app/theme.css .tone-*): [from, to] for the faint diagonal gradient, and the hairline border. */
export const TONES = {
  slate: { from: "#1b1b1d", to: "#141415", border: "#262628", ink: C.white },
  blue: { from: "#4034c4", to: "#3329a6", border: "#5a4fd8", ink: C.white },
  indigo: { from: "#3b2fb6", to: "#2d2391", border: "#5246d0", ink: C.white },
  rose: { from: "#b3241f", to: "#961c18", border: "#cc3a34", ink: C.white },
  red: { from: "#b3241f", to: "#961c18", border: "#cc3a34", ink: C.white },
  amber: { from: "#ffd91a", to: "#ffc400", border: "#ffe766", ink: C.amberDark },
  pink: { from: "#d6336c", to: "#b92558", border: "#ea5a8d", ink: C.white },
  violet: { from: "#6d3fd6", to: "#5a2fb8", border: "#8860ea", ink: C.white },
  emerald: { from: "#178a46", to: "#107238", border: "#2aa862", ink: C.white },
  teal: { from: "#0f8f94", to: "#0a7378", border: "#25adb2", ink: C.white },
} as const;
export type Tone = keyof typeof TONES;

/** Tailwind colour scale (300–700) for the hues the game and note cards use (HUES in lib/games/decks.ts). */
export const TW: Record<string, Record<300 | 400 | 500 | 600 | 700, string>> = {
  red: { 300: "#fca5a5", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c" },
  orange: { 300: "#fdba74", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c" },
  amber: { 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309" },
  yellow: { 300: "#fde047", 400: "#facc15", 500: "#eab308", 600: "#ca8a04", 700: "#a16207" },
  green: { 300: "#86efac", 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d" },
  emerald: { 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857" },
  teal: { 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e" },
  cyan: { 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490" },
  sky: { 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1" },
  blue: { 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8" },
  indigo: { 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca" },
  violet: { 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9" },
  purple: { 300: "#d8b4fe", 400: "#c084fc", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce" },
  fuchsia: { 300: "#f0abfc", 400: "#e879f9", 500: "#d946ef", 600: "#c026d3", 700: "#a21caf" },
  pink: { 300: "#f9a8d4", 400: "#f472b6", 500: "#ec4899", 600: "#db2777", 700: "#be185d" },
  rose: { 300: "#fda4af", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c" },
  slate: { 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155" },
};

/** "from-sky-600 to-sky-700" (the web's Tailwind gradient classes) → two colours for a LinearGradient. */
export const gradientOf = (classes: string): [string, string] => {
  const pick = (prefix: "from" | "to") => {
    const m = classes.match(new RegExp(`${prefix}-([a-z]+)-(\\d{3})`));
    const shade = m ? (Number(m[2]) as 300 | 400 | 500 | 600 | 700) : 600;
    return (m && TW[m[1]]?.[shade]) || TW.slate[600];
  };
  return [pick("from"), pick("to")];
};

/** "bg-[#9d8df1]" (the feeling colours in lib/constants.ts) → "#9d8df1". */
export const bgHexOf = (cls: string, fallback = "#2a2a2a") => cls.match(/#[0-9a-fA-F]{6}/)?.[0] ?? fallback;

export const R = { card: 24, row: 16, input: 12, pill: 999 } as const;
export const S = { page: 24, gap: 12 } as const;

/** One spring for everything that moves, so the whole app has one feel. Critically damped: no wobble, no lag. */
export const SPRING = { damping: 22, stiffness: 260, mass: 0.9 } as const;
export const SPRING_SOFT = { damping: 26, stiffness: 180, mass: 1 } as const;
export const PRESS_SCALE = 0.97;
