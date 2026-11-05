// What the partner last sent to this phone's widgets (a doodle and a live picture), already decrypted and kept on
// the device so the widgets can redraw without the app, a network call or the key. Only this phone's own storage
// holds the plain copy; the server only ever has ciphertext (src/data/widgetShare.ts).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseStroke } from "@/lib/games/strokes";

export interface SharedWidgets {
  /** Who and which couple, so the widget can fetch the newest by itself when Android refreshes it (not secret) */
  coupleId: string;
  uid: string;
  partnerUid: string;
  partnerName: string;
  doodle: { svg: string; at: string } | null;
  pic: { data: string; at: string } | null;
}

const KEY = "hm_widget_shared_v1";

/** The doodle widget's paper, also what the eraser draws with there */
export const PAPER = "#f4efe6";

export const saveShared = (s: SharedWidgets | null) =>
  (s ? AsyncStorage.setItem(KEY, JSON.stringify(s)) : AsyncStorage.removeItem(KEY)).catch(() => {});

export const loadShared = async (): Promise<SharedWidgets | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SharedWidgets) : null;
  } catch {
    return null;
  }
};

const POINT = /^\d{1,4},\d{1,4}$/;

/**
 * Strokes on the 0–1000 grid → one SVG for the widget. Widths are fixed in grid units (the widget is small, so lines
 * are drawn a little bolder than in the app). Only numbers and hex colours from parseStroke reach the markup.
 */
export function doodleToSvg(strokes: string[]): string {
  const paths = strokes.map((s) => {
    const { color, width, points } = parseStroke(s);
    const pts = points.trim().split(" ").filter((p) => POINT.test(p));
    if (!pts.length) return "";
    const d = pts.length === 1 ? `M${pts[0]} l0.1,0` : `M${pts[0]} L${pts.slice(1).join(" ")}`;
    const eraser = color === "#ffffff";
    return `<path d="${d}" fill="none" stroke="${eraser ? PAPER : color}" stroke-width="${eraser ? 70 : width * 4}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">${paths}</svg>`;
}

const two = (n: number) => String(n).padStart(2, "0");

/**
 * When something arrived: "8:45 pm" today, "Yesterday", or "5 Nov". Widgets redraw rarely, so a clock time is used
 * instead of "5m ago", which would be wrong a minute later.
 */
export function stamp(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) {
    const h = d.getHours();
    return `${h % 12 || 12}:${two(d.getMinutes())} ${h < 12 ? "am" : "pm"}`;
  }
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "Yesterday";
  return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}`;
}

export const firstName = (name: string) => (name.trim().split(/\s+/)[0] || "Partner");
