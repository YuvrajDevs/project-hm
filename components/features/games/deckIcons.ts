import { Dice5, Flame, Hand, HeartHandshake, Moon, Split, Users, Zap, type LucideIcon } from "lucide-react";
import type { DeckId } from "@/lib/games/decks";

export const DECK_ICONS: Record<DeckId, LucideIcon> = {
  wyr: Split,
  thisorthat: Zap,
  nhie: Hand,
  likely: Users,
  truthdare: Dice5,
  spicy: Flame,
  intimacy: HeartHandshake,
  deep: Moon,
};

// Open a specific game on its full screen
export const openGame = (id: string) => window.dispatchEvent(new CustomEvent("openGame", { detail: { id } }));
export const openQuestions = (id: string) => window.dispatchEvent(new CustomEvent("openQuestions", { detail: { id } }));
