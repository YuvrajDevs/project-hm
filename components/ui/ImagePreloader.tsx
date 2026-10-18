"use client";

import { useEffect } from "react";
import { STICKER_IDS, stickerUrl } from "@/lib/stickers";

const ICONS = ["feeling_anxious_us.png", "feeling_connected.png", "feeling_distant.png", "feeling_hard_day.png", "feeling_ignored.png", "feeling_love_note.png", "feeling_need_attention.png", "feeling_overwhelmed.png", "feeling_space.png", "heart_inline.png", "love_acts.png", "love_custom.png", "love_gifts.png", "love_time.png", "love_touch.png", "love_words.png", "marker_after_dark.png", "need_advice.png", "need_listen.png", "need_reassure.png", "need_say_it.png", "need_talk.png", "signal_anxious.png", "signal_appreciative.png", "signal_brighter.png", "signal_closeness.png", "signal_conflict.png", "signal_energized.png", "signal_gloomy.png", "signal_love.png", "signal_not_okay.png", "signal_peace.png", "signal_reassurance.png", "signal_tired.png", "ui_section_about.png", "ui_section_hard.png", "ui_section_likes.png", "ui_section_little.png", "ui_section_loved.png", "white_flag.png"];

// Warms the browser cache with the pixel icons (first) and the stickers (a moment later), so they are
// already there when a screen needs them instead of popping in after a blank.
export const ImagePreloader = () => {
  useEffect(() => {
    const load = (src: string) => { const img = new Image(); img.decoding = "async"; img.src = src; };
    ICONS.forEach((name) => load(`/icons/${name}`));
    const t = window.setTimeout(() => STICKER_IDS.forEach((id) => load(stickerUrl(id))), 800);
    return () => window.clearTimeout(t);
  }, []);
  return null;
};
