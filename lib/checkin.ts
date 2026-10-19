// How warm or cold each headspace is, from -1 (coldest) to 1 (warmest)
const VALENCE: Record<string, number> = {
  "Love": 1, "Appreciative": 0.9, "Closeness": 0.8, "Energized": 0.7, "Brighter": 0.6, "Peace": 0.5, "Reassurance": 0.3,
  "Tired": -0.2, "Not Okay": -0.5, "Anxious": -0.6, "Gloomy": -0.7, "In Conflict": -1,
};

export const headspaceScore = (status?: string) => (status ? VALENCE[status] ?? 0 : 0);

/** The two of you together: the average of whoever has a headspace. Warm is above 0, cold below. */
export function combinedHeadspace(statuses: (string | undefined)[]) {
  const known = statuses.filter(Boolean) as string[];
  return known.length ? known.reduce((s, x) => s + headspaceScore(x), 0) / known.length : 0;
}

const COLD = [0x29, 0x62, 0xff]; // #2962FF
const MID = [0xe9, 0xe6, 0xd8];  // soft off-white between the two, so the middle never turns grey
const WARM = [0xff, 0xd6, 0x00]; // #FFD600

/** Blue when the day ended cold, yellow when it ended warm. */
export function scoreColor(score: number) {
  const t = Math.max(0, Math.min(1, (score + 1) / 2));
  const [from, to, k] = t < 0.5 ? [COLD, MID, t * 2] : [MID, WARM, (t - 0.5) * 2];
  const [r, g, b] = from.map((f, i) => Math.round(f + (to[i] - f) * k));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** The day you checked in and it hasn't ended yet. */
export const SYNCED_GREEN = "#22c55e";
