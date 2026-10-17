// Scribble strokes are stored as "colour|x,y x,y …". The colour is hex without the #, or "e" for the eraser.
// Strokes from before colours existed have no colour part and draw in black.

export const PALETTE = [
  { id: "111111", name: "Black" }, { id: "ef4444", name: "Red" }, { id: "f97316", name: "Orange" },
  { id: "22c55e", name: "Green" }, { id: "3b82f6", name: "Blue" }, { id: "a855f7", name: "Purple" }, { id: "ec4899", name: "Pink" },
];
export const ERASER = "e";
export const PEN_WIDTH = 4;
export const ERASER_WIDTH = 22;

const BLACK = "#111111";

export const encodeStroke = (tool: string, points: string) => `${tool}|${points}`;

export const parseStroke = (stroke: string) => {
  const bar = stroke.indexOf("|");
  if (bar < 0) return { color: BLACK, width: PEN_WIDTH, points: stroke };
  const head = stroke.slice(0, bar);
  const points = stroke.slice(bar + 1);
  // The pad is white, so erasing is drawing wide and white
  if (head === ERASER) return { color: "#ffffff", width: ERASER_WIDTH, points };
  // Anything that isn't a plain hex colour is ignored, so a bad stroke can't inject styling
  return { color: /^[0-9a-f]{6}$/.test(head) ? `#${head}` : BLACK, width: PEN_WIDTH, points };
};
