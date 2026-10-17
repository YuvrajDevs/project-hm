import { CONTENT } from "@/lib/games/content";
import { DECK_BY_ID } from "@/lib/games/decks";
import { isPublicDeck, type PublicDeckId } from "@/lib/seo/sfw-decks";

// Formats cards for display on a public page, mirroring the phrasing
// lib/games/engine.ts's getCard() builds for the real game — same text, no
// drift between what a visitor reads and what the app actually deals.
export function getPublicSampleCards(deckId: PublicDeckId, count: number): string[] {
  if (!isPublicDeck(deckId)) return [];
  const deck = DECK_BY_ID[deckId];
  const content = CONTENT[deckId];
  if (!deck || !content) return [];
  switch (content.kind) {
    case "pair": {
      const prefix = deck.section === "wyr" ? "Would you rather " : "";
      return content.items.slice(0, count).map(([a, b]) => `${prefix}${a} or ${b}?`);
    }
    case "statement": {
      const o = deck.options ?? { a: "Yes", b: "No" };
      return content.items.slice(0, count).map((item) => `${o.prefix ?? ""}${item}${o.suffix ?? ""}`);
    }
    case "who":
      return content.items.slice(0, count).map((item) => `Who's more likely to ${item}?`);
    case "words":
      return content.items.slice(0, count);
    case "open":
      return content.items.slice(0, count);
    default:
      return [];
  }
}

// Truth-or-dare decks keep truth and dare as two separate lists.
export function getPublicTruthDare(deckId: PublicDeckId, count: number): { truth: string[]; dare: string[] } {
  if (!isPublicDeck(deckId)) return { truth: [], dare: [] };
  const content = CONTENT[deckId];
  if (!content || content.kind !== "td") return { truth: [], dare: [] };
  return { truth: content.truth.slice(0, count), dare: content.dare.slice(0, count) };
}
