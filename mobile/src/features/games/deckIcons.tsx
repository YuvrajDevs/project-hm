// Lucide icon per deck (same as components/features/games/deckIcons.ts on the web).
import {
  Brain, CalendarHeart, Candy, Dice5, Eye, Flame, Grid3x3, Hand, Heart, HeartHandshake, Lightbulb, Map, MessageCircle,
  Moon, Pencil, Utensils, Coffee, Palette, Mountain, Clapperboard, Plane, Scale, Shield, Sparkles, Split, Sprout, Users, Wine, Zap, Circle, Snowflake, Skull, Lock,
  type LucideIcon,
} from "lucide-react-native";
import { DECK_BY_ID, type DeckId } from "@/lib/games/decks";
import { TW } from "~/theme/tokens";

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
  about_food: Utensils,
  about_lifestyle: Coffee,
  about_vibes: Palette,
  about_travel: Mountain,
  about_screen: Clapperboard,
  about_dates: HeartHandshake,
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

/** A deck's icon as an element. Picking the component inside render (const Icon = …) trips the React Compiler. */
export function DeckIcon({ id, size, color }: { id: DeckId; size: number; color: string }) {
  const Icon = ICONS[id] ?? Sparkles;
  return <Icon size={size} color={color} />;
}

/** The deck's main colour scale (its first card hue), for accents on its screens. */
export const deckHue = (id: DeckId) => {
  const m = DECK_BY_ID[id]?.cards[0].match(/from-([a-z]+)-/);
  return (m && TW[m[1]]) || TW.slate;
};
