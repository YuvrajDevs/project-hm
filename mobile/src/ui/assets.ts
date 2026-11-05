// Generated from ../public/icons and ../public/stickers: the same pixel art the website uses, bundled into the app.
// Metro needs every require() written out, so this map is the one place they are listed.
// A bundled asset is a numeric module id at runtime
type Asset = number;

export const ICONS: Record<string, Asset> = {
  "/icons/feeling_anxious_us.png": require("../../../public/icons/feeling_anxious_us.png"),
  "/icons/feeling_connected.png": require("../../../public/icons/feeling_connected.png"),
  "/icons/feeling_distant.png": require("../../../public/icons/feeling_distant.png"),
  "/icons/feeling_hard_day.png": require("../../../public/icons/feeling_hard_day.png"),
  "/icons/feeling_ignored.png": require("../../../public/icons/feeling_ignored.png"),
  "/icons/feeling_love_note.png": require("../../../public/icons/feeling_love_note.png"),
  "/icons/feeling_need_attention.png": require("../../../public/icons/feeling_need_attention.png"),
  "/icons/feeling_overwhelmed.png": require("../../../public/icons/feeling_overwhelmed.png"),
  "/icons/feeling_space.png": require("../../../public/icons/feeling_space.png"),
  "/icons/heart_inline.png": require("../../../public/icons/heart_inline.png"),
  "/icons/love_acts.png": require("../../../public/icons/love_acts.png"),
  "/icons/love_custom.png": require("../../../public/icons/love_custom.png"),
  "/icons/love_gifts.png": require("../../../public/icons/love_gifts.png"),
  "/icons/love_time.png": require("../../../public/icons/love_time.png"),
  "/icons/love_touch.png": require("../../../public/icons/love_touch.png"),
  "/icons/love_words.png": require("../../../public/icons/love_words.png"),
  "/icons/marker_after_dark.png": require("../../../public/icons/marker_after_dark.png"),
  "/icons/need_advice.png": require("../../../public/icons/need_advice.png"),
  "/icons/need_listen.png": require("../../../public/icons/need_listen.png"),
  "/icons/need_reassure.png": require("../../../public/icons/need_reassure.png"),
  "/icons/need_say_it.png": require("../../../public/icons/need_say_it.png"),
  "/icons/need_talk.png": require("../../../public/icons/need_talk.png"),
  "/icons/signal_anxious.png": require("../../../public/icons/signal_anxious.png"),
  "/icons/signal_appreciative.png": require("../../../public/icons/signal_appreciative.png"),
  "/icons/signal_brighter.png": require("../../../public/icons/signal_brighter.png"),
  "/icons/signal_closeness.png": require("../../../public/icons/signal_closeness.png"),
  "/icons/signal_conflict.png": require("../../../public/icons/signal_conflict.png"),
  "/icons/signal_energized.png": require("../../../public/icons/signal_energized.png"),
  "/icons/signal_gloomy.png": require("../../../public/icons/signal_gloomy.png"),
  "/icons/signal_love.png": require("../../../public/icons/signal_love.png"),
  "/icons/signal_not_okay.png": require("../../../public/icons/signal_not_okay.png"),
  "/icons/signal_peace.png": require("../../../public/icons/signal_peace.png"),
  "/icons/signal_reassurance.png": require("../../../public/icons/signal_reassurance.png"),
  "/icons/signal_tired.png": require("../../../public/icons/signal_tired.png"),
  "/icons/ui_section_about.png": require("../../../public/icons/ui_section_about.png"),
  "/icons/ui_section_hard.png": require("../../../public/icons/ui_section_hard.png"),
  "/icons/ui_section_likes.png": require("../../../public/icons/ui_section_likes.png"),
  "/icons/ui_section_little.png": require("../../../public/icons/ui_section_little.png"),
  "/icons/ui_section_loved.png": require("../../../public/icons/ui_section_loved.png"),
  "/icons/white_flag.png": require("../../../public/icons/white_flag.png"),
};

export const STICKERS: Record<string, Asset> = {
  s00: require("../../../public/stickers/s00.webp"),
  s01: require("../../../public/stickers/s01.webp"),
  s02: require("../../../public/stickers/s02.webp"),
  s03: require("../../../public/stickers/s03.webp"),
  s04: require("../../../public/stickers/s04.webp"),
  s05: require("../../../public/stickers/s05.webp"),
  s06: require("../../../public/stickers/s06.webp"),
  s07: require("../../../public/stickers/s07.webp"),
  s08: require("../../../public/stickers/s08.webp"),
  s09: require("../../../public/stickers/s09.webp"),
  s10: require("../../../public/stickers/s10.webp"),
  s11: require("../../../public/stickers/s11.webp"),
  s12: require("../../../public/stickers/s12.webp"),
  s13: require("../../../public/stickers/s13.webp"),
  s14: require("../../../public/stickers/s14.webp"),
  s15: require("../../../public/stickers/s15.webp"),
  s16: require("../../../public/stickers/s16.webp"),
  s17: require("../../../public/stickers/s17.webp"),
  s18: require("../../../public/stickers/s18.webp"),
  s19: require("../../../public/stickers/s19.webp"),
  s20: require("../../../public/stickers/s20.webp"),
  s21: require("../../../public/stickers/s21.webp"),
  s22: require("../../../public/stickers/s22.webp"),
  s23: require("../../../public/stickers/s23.webp"),
  s24: require("../../../public/stickers/s24.webp"),
  s25: require("../../../public/stickers/s25.webp"),
  s26: require("../../../public/stickers/s26.webp"),
};

export const MASCOT: Asset = require("../../../public/mascot.webp");
export const LOGO: Asset = require("../../../public/logo.png");

/** A pixel icon by the web path the shared constants use ("/icons/feeling_hard_day.png"). */
export const iconFor = (url: string | undefined): Asset | undefined => (url ? ICONS[url] : undefined);
export const HOME_ICON: Asset = require("../../../public/home-icon.png");
