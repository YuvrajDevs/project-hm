import { test } from "node:test";
import assert from "node:assert/strict";
import { ERASER_WIDTH, PEN_WIDTH, encodeStroke, parseStroke } from "../lib/games/strokes.ts";

test("a coloured stroke round-trips", () => {
  const s = encodeStroke("ef4444", "10,20 30,40");
  assert.deepEqual(parseStroke(s), { color: "#ef4444", width: PEN_WIDTH, points: "10,20 30,40" });
});

test("the eraser draws wide and white", () => {
  assert.deepEqual(parseStroke(encodeStroke("e", "1,2 3,4")), { color: "#ffffff", width: ERASER_WIDTH, points: "1,2 3,4" });
});

test("strokes saved before colours existed still draw, in black", () => {
  assert.deepEqual(parseStroke("90,19 418,49 746,79"), { color: "#111111", width: PEN_WIDTH, points: "90,19 418,49 746,79" });
  assert.deepEqual(parseStroke("5,5"), { color: "#111111", width: PEN_WIDTH, points: "5,5" });
});

test("a bad colour falls back to black instead of reaching the page", () => {
  assert.equal(parseStroke("red;stroke:url(x)|1,1 2,2").color, "#111111");
  assert.equal(parseStroke("zzzzzz|1,1").color, "#111111");
  assert.equal(parseStroke("EF4444|1,1").color, "#111111");
});
