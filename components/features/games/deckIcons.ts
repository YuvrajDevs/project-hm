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

export const openGame = () => window.dispatchEvent(new CustomEvent("openGame"));
export const openQuestions = () => window.dispatchEvent(new CustomEvent("openQuestions"));
