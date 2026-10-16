import {
  Brain, CalendarHeart, Candy, Dice5, Eye, Flame, Grid3x3, Hand, Heart, HeartHandshake, Lightbulb, Map, MessageCircle,
  Moon, Pencil, Plane, Scale, Shield, Sparkles, Split, Sprout, Users, Wine, Zap, Circle, Snowflake, Skull, Lock,
  type LucideIcon,
} from "lucide-react";
import type { DeckId } from "@/lib/games/decks";

const ICONS: Record<string, LucideIcon> = {
  scribble: Pencil,
  xo: Grid3x3,
  connect4: Circle,
  tot_classic: Zap,
  nhie_classic: Hand,
  likely_classic: Users,
  tot_after_dark: Zap,
  nhie_after_dark: Hand,
  likely_after_dark: Users,
  yay_or_nay: Flame,
  icebreakers: Snowflake,
  know_better: Sparkles,
  date_night: Wine,
  expressing: MessageCircle,
  valentines: Heart,
  getting_warmer: Candy,
  thats_spicy: Flame,
  after_12: Moon,
  long_distance: Plane,
  when_we_meet: CalendarHeart,
  thats_kinky: Lock,
  raw_it_is: Flame,
  wyr_vanilla: Split,
  wyr_icebreakers: Snowflake,
  wyr_hypothetical: Lightbulb,
  wyr_us: Heart,
  wyr_dilemmas: Scale,
  wyr_spicy: Flame,
  wyr_unhinged: Skull,
  tod_easy: Dice5,
  tod_real: MessageCircle,
  tod_flirty: Eye,
  tod_spicy: Flame,
  tod_no_limits: Dice5,
  how_we_love: HeartHandshake,
  what_we_expect: Map,
  communication: MessageCircle,
  vulnerability: Shield,
  our_future: Sprout,
  deeper: Brain,
  unspoken: Moon,
  closer: Heart,
};

export const DECK_ICONS = new Proxy(ICONS, { get: (t, k: string) => t[k] ?? Sparkles }) as Record<DeckId, LucideIcon>;

// Open a specific game on its full screen
export const openGame = (id: string) => window.dispatchEvent(new CustomEvent("openGame", { detail: { id } }));
export const openQuestions = (id: string) => window.dispatchEvent(new CustomEvent("openQuestions", { detail: { id } }));
